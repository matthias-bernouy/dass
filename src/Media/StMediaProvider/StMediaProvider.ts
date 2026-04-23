import sharp from "sharp";

import type {
    FileMetadata,
    FolderMetadata,
    ImageFit,
    ImageFormat,
    MediaCreateFolderOptions,
    MediaDeleteItemOptions,
    MediaErrorCode,
    MediaGetItemsOptions,
    MediaItem,
    MediaItemsPage,
    MediaItemType,
    MediaResponse,
    MediaUpdateItemOptions,
    MediaUploadFileOptions,
} from "../Media";
import type { Runner } from "../../Runner/Runner";
import type { MediaStorage } from "./MediaStorage";
import { InMemoryMediaStorage } from "./InMemoryMediaStorage";

/**
 * Server-side Media provider. Owns all business logic (validation, conflicts,
 * recursion, URL construction, image transforms) and delegates persistence
 * to a pluggable `MediaStorage` (in-memory by default). Mounts HTTP endpoints
 * on the runner it receives.
 *
 * Expected to be mounted inside its own group, e.g.
 * `rootRunner.group("/cms/media", (r) => new StMediaProvider(r))`. The
 * matching `StMediaConsumer` points at the same base URL and the admin UI,
 * Control and Delivery all go through it.
 *
 * Server-only: owns master state, raw bytes, and uses `sharp`. NOT
 * browser-deployable. Swap the storage for a persistent backend without
 * touching the Consumer or the rest of the app.
 */
export class StMediaProvider {

    private readonly _storage: MediaStorage;

    /** URL prefix where the provider was mounted, used to build `absoluteURL`. */
    private readonly _prefix: string;

    /** Caps enforced by `uploadFile`. The Consumer advertises matching values. */
    readonly maxFileSize = 50 * 1024 * 1024;

    constructor(runner: Runner, storage: MediaStorage = new InMemoryMediaStorage()) {
        this._storage = storage;
        this._prefix = runner.basePath === "/" ? "" : runner.basePath.replace(/\/+$/, "");
        runner.get   ("/items",  (req) => this._handleList(req));
        runner.get   ("/item",   (req) => this._handleGet(req));
        runner.get   ("/file",   (req) => this._handleFile(req));
        runner.post  ("/file",   (req) => this._handleUpload(req));
        runner.post  ("/folder", (req) => this._handleCreateFolder(req));
        runner.patch ("/item",   (req) => this._handleUpdate(req));
        runner.delete("/item",   (req) => this._handleDelete(req));
    }

    // ── Storage operations (used by the HTTP handlers) ───────────────────

    async getItems(opts: MediaGetItemsOptions = {}): Promise<MediaResponse<MediaItemsPage>> {
        const folderID = opts.folderID ?? null;
        const page  = opts.pagination?.page  ?? 1;
        const limit = opts.pagination?.limit ?? 100;

        const all = await this._storage.listItems();
        let items = all.filter((i) => i.parentFolderID === folderID);

        if (opts.accept && opts.accept.length > 0) {
            items = items.filter((i) => opts.accept!.includes(i.type));
        }
        if (opts.search) {
            const needle = opts.search.toLowerCase();
            items = items.filter((i) => i.name.toLowerCase().includes(needle));
        }

        items.sort((a, b) => {
            const sortBy = opts.sortBy ?? "name";
            const dir = opts.sortOrder === "desc" ? -1 : 1;
            if (sortBy === "name")      return a.name.localeCompare(b.name) * dir;
            if (sortBy === "createdAt") return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
            if (sortBy === "updatedAt") return (a.updatedAt.getTime() - b.updatedAt.getTime()) * dir;
            if (sortBy === "size") {
                const sa = a.type === "folder" ? 0 : a.size;
                const sb = b.type === "folder" ? 0 : b.size;
                return (sa - sb) * dir;
            }
            return 0;
        });

        const total = items.length;
        const start = (page - 1) * limit;
        const slice = items.slice(start, start + limit);

        return {
            ok:   true,
            data: { items: slice, total, page, limit, hasMore: start + limit < total },
        };
    }

    async getItem(id: string): Promise<MediaResponse<MediaItem>> {
        const item = await this._storage.getItem(id);
        if (!item) return err("not_found", `No item with id "${id}"`);
        return { ok: true, data: item };
    }

    async uploadFile(opts: MediaUploadFileOptions): Promise<MediaResponse<FileMetadata>> {
        const parent = opts.folderID ?? null;
        if (parent !== null && !(await this._storage.getItem(parent))) {
            return err("destination_not_found", `No folder with id "${parent}"`);
        }
        if (!opts.overwrite && await this._nameTaken(opts.name, parent)) {
            return err("conflict", `"${opts.name}" already exists in that folder`);
        }

        const bytes = await toBytes(opts.data);
        if (bytes.byteLength > this.maxFileSize) {
            return err("file_too_large", `File exceeds ${this.maxFileSize} bytes`);
        }

        const mimeType = opts.mimeType ?? "application/octet-stream";
        const id = crypto.randomUUID();
        const now = new Date();
        const absoluteURL = `${this._prefix}/file?id=${id}`;

        const base = {
            id,
            name:           opts.name,
            parentFolderID: parent,
            createdAt:      now,
            updatedAt:      now,
            size:           bytes.byteLength,
            mimeType,
            absoluteURL,
        };

        let stored: FileMetadata;
        if (mimeType.startsWith("image/")) {
            const dims = await this._readImageDimensions(bytes);
            stored = { ...base, type: "image", imageInfo: dims };
        } else {
            stored = { ...base, type: classifyNonImage(mimeType) };
        }

        await this._storage.putItem(stored);
        await this._storage.putBytes(id, bytes);
        return { ok: true, data: stored };
    }

    async createFolder(opts: MediaCreateFolderOptions): Promise<MediaResponse<FolderMetadata>> {
        const parent = opts.parentFolderID ?? null;
        if (parent !== null && !(await this._storage.getItem(parent))) {
            return err("destination_not_found", `No folder with id "${parent}"`);
        }
        if (await this._nameTaken(opts.name, parent)) {
            return err("conflict", `"${opts.name}" already exists in that folder`);
        }

        const id = crypto.randomUUID();
        const now = new Date();
        const folder: FolderMetadata = {
            id,
            name:           opts.name,
            parentFolderID: parent,
            createdAt:      now,
            updatedAt:      now,
            type:           "folder",
            itemCount:      0,
        };
        await this._storage.putItem(folder);
        return { ok: true, data: folder };
    }

    async updateItem(opts: MediaUpdateItemOptions): Promise<MediaResponse<MediaItem>> {
        const item = await this._storage.getItem(opts.id);
        if (!item) return err("not_found", `No item with id "${opts.id}"`);

        const nextParent = opts.parentFolderID === undefined
            ? item.parentFolderID
            : (opts.parentFolderID || null);
        const nextName = opts.name ?? item.name;

        if (opts.parentFolderID && !(await this._storage.getItem(opts.parentFolderID))) {
            return err("destination_not_found", `No folder with id "${opts.parentFolderID}"`);
        }
        if ((opts.name || opts.parentFolderID) && await this._nameTaken(nextName, nextParent, item.id)) {
            return err("conflict", `"${nextName}" already exists in that folder`);
        }
        if (item.type === "folder" && opts.parentFolderID && await this._isDescendant(opts.parentFolderID, item.id)) {
            return err("validation_error", `Cannot move a folder into its own descendant`);
        }

        const updated = { ...item, name: nextName, parentFolderID: nextParent, updatedAt: new Date() } as MediaItem;
        await this._storage.putItem(updated);
        return { ok: true, data: updated };
    }

    async deleteItem(opts: MediaDeleteItemOptions): Promise<MediaResponse<{ id: string }>> {
        const item = await this._storage.getItem(opts.id);
        if (!item) return err("not_found", `No item with id "${opts.id}"`);

        if (item.type === "folder") {
            const all = await this._storage.listItems();
            const hasChildren = all.some((i) => i.parentFolderID === opts.id);
            if (hasChildren && !opts.recursive) {
                return err("folder_not_empty", `Folder "${item.name}" is not empty`);
            }
            if (opts.recursive) await this._deleteSubtree(opts.id);
        }
        await this._storage.deleteItem(opts.id);
        return { ok: true, data: { id: opts.id } };
    }

    // ── HTTP handlers ────────────────────────────────────────────────────

    private async _handleList(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const accept = url.searchParams.get("accept");
        const result = await this.getItems({
            folderID:   url.searchParams.get("folderID") ?? undefined,
            accept:     accept ? (accept.split(",") as MediaItemType[]) : undefined,
            search:     url.searchParams.get("search") ?? undefined,
            sortBy:     (url.searchParams.get("sortBy")    as MediaGetItemsOptions["sortBy"])    ?? undefined,
            sortOrder:  (url.searchParams.get("sortOrder") as MediaGetItemsOptions["sortOrder"]) ?? undefined,
            pagination: {
                page:  parseInt(url.searchParams.get("page")  ?? "1",   10),
                limit: parseInt(url.searchParams.get("limit") ?? "100", 10),
            },
        });
        if (result.ok) result.data.items.forEach((i) => this._qualifyItem(i, req));
        return Response.json(result);
    }

    private async _handleGet(req: Request): Promise<Response> {
        const id = new URL(req.url).searchParams.get("id");
        if (!id) return Response.json(err("validation_error", "Missing id"), { status: 400 });
        const result = await this.getItem(id);
        if (result.ok) this._qualifyItem(result.data, req);
        return Response.json(result);
    }

    private async _handleFile(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) return new Response("Missing id", { status: 400 });

        const item = await this._storage.getItem(id);
        if (!item || item.type === "folder") return new Response("Not found", { status: 404 });

        const bytes = await this._storage.getBytes(id);
        if (!bytes) return new Response("Not found", { status: 404 });

        const t = this._parseTransform(url);
        let out = bytes;
        let mime = item.mimeType;

        if (item.type === "image" && this._hasTransform(t)) {
            try {
                const transformed = await this._transformImage(bytes, t);
                out  = transformed.bytes;
                mime = transformed.mimeType;
            } catch (e) {
                console.error("[StMediaProvider] image transform failed, serving original:", e);
            }
        }

        return new Response(out as unknown as BodyInit, {
            status:  200,
            headers: {
                "Content-Type":           mime,
                "Cache-Control":          "public, max-age=31536000",
                "X-Content-Type-Options": "nosniff",
            },
        });
    }

    private async _handleUpload(req: Request): Promise<Response> {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
            return Response.json(err("validation_error", "Missing file"), { status: 400 });
        }
        const folderID = form.get("folderID")?.toString() || undefined;
        const mimeTypeOverride = form.get("mimeType")?.toString() || undefined;
        const overwrite = form.get("overwrite") === "1";
        const result = await this.uploadFile({
            data: file,
            name: file.name,
            mimeType: mimeTypeOverride ?? file.type,
            ...(folderID ? { folderID } : {}),
            overwrite,
        });
        if (result.ok) this._qualifyItem(result.data, req);
        return Response.json(result);
    }

    private async _handleCreateFolder(req: Request): Promise<Response> {
        const body = await req.json() as MediaCreateFolderOptions;
        if (!body?.name) {
            return Response.json(err("invalid_name", "Name is required"), { status: 400 });
        }
        return Response.json(await this.createFolder(body));
    }

    private async _handleUpdate(req: Request): Promise<Response> {
        const id = new URL(req.url).searchParams.get("id");
        if (!id) return Response.json(err("validation_error", "Missing id"), { status: 400 });
        const body = await req.json() as Omit<MediaUpdateItemOptions, "id">;
        const result = await this.updateItem({ id, ...body });
        if (result.ok) this._qualifyItem(result.data, req);
        return Response.json(result);
    }

    private async _handleDelete(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) return Response.json(err("validation_error", "Missing id"), { status: 400 });
        const recursive = url.searchParams.get("recursive") === "true" || url.searchParams.get("recursive") === "1";
        return Response.json(await this.deleteItem({ id, recursive }));
    }

    // ── Image pipeline ───────────────────────────────────────────────────

    private _parseTransform(url: URL): TransformOpts {
        const w   = url.searchParams.get("w");
        const h   = url.searchParams.get("h");
        const fit = url.searchParams.get("fit") as ImageFit | null;
        const fmt = url.searchParams.get("fmt") as ImageFormat | null;
        const q   = url.searchParams.get("q");
        return {
            width:   w ? parseInt(w, 10) : undefined,
            height:  h ? parseInt(h, 10) : undefined,
            fit:     fit   ?? undefined,
            format:  fmt   ?? undefined,
            quality: q ? parseInt(q, 10) : undefined,
        };
    }

    private _hasTransform(t: TransformOpts): boolean {
        return t.width !== undefined || t.height !== undefined
            || t.format !== undefined || t.quality !== undefined
            || t.fit !== undefined;
    }

    private async _transformImage(
        bytes: Uint8Array,
        t: TransformOpts,
    ): Promise<{ bytes: Uint8Array; mimeType: string }> {
        let pipe = sharp(bytes);

        if (t.width !== undefined || t.height !== undefined) {
            pipe = pipe.resize({
                width:  t.width,
                height: t.height,
                fit:    t.fit === "contain" ? "contain"
                      : t.fit === "fill"    ? "fill"
                      :                       "cover",
                withoutEnlargement: false,
            });
        }

        const quality = t.quality ?? 80;
        let mimeType: string;

        switch (t.format) {
            case "jpeg": pipe = pipe.jpeg({ quality });      mimeType = "image/jpeg"; break;
            case "png":  pipe = pipe.png ({ quality });      mimeType = "image/png";  break;
            case "webp": pipe = pipe.webp({ quality });      mimeType = "image/webp"; break;
            case "avif": pipe = pipe.avif({ quality });      mimeType = "image/avif"; break;
            default:
                // No explicit format: let sharp keep the input format. Only
                // re-encode if a quality override was requested.
                if (t.quality !== undefined) {
                    pipe = pipe.webp({ quality });
                    mimeType = "image/webp";
                } else {
                    mimeType = "image/webp"; // will be set from metadata below
                }
        }

        const buf = await pipe.toBuffer({ resolveWithObject: true });
        return {
            bytes:    new Uint8Array(buf.data.buffer, buf.data.byteOffset, buf.data.byteLength),
            mimeType: t.format ? mimeType! : `image/${buf.info.format}`,
        };
    }

    private async _readImageDimensions(bytes: Uint8Array): Promise<{ width: number; height: number }> {
        try {
            const meta = await sharp(bytes).metadata();
            return { width: meta.width ?? 0, height: meta.height ?? 0 };
        } catch {
            return { width: 0, height: 0 };
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Rewrite a file's `absoluteURL` to include the scheme/host/port of the
     * incoming request, so clients receive `http://host:port/prefix/file?id=…`
     * rather than a bare path. No-op for folders and for URLs that are
     * already fully qualified.
     */
    private _qualifyItem(item: MediaItem, req: Request): void {
        if (item.type === "folder") return;
        if (/^https?:\/\//i.test(item.absoluteURL)) return;
        item.absoluteURL = new URL(req.url).origin + item.absoluteURL;
    }

    private async _nameTaken(name: string, parentFolderID: string | null, excludeId?: string): Promise<boolean> {
        const all = await this._storage.listItems();
        for (const i of all) {
            if (i.id === excludeId) continue;
            if (i.parentFolderID === parentFolderID && i.name === name) return true;
        }
        return false;
    }

    private async _isDescendant(candidateDescendantId: string, ancestorId: string): Promise<boolean> {
        let cursor: string | null = candidateDescendantId;
        while (cursor) {
            if (cursor === ancestorId) return true;
            const node = await this._storage.getItem(cursor);
            cursor = node?.parentFolderID ?? null;
        }
        return false;
    }

    private async _deleteSubtree(folderId: string): Promise<void> {
        const all = await this._storage.listItems();
        for (const i of all) {
            if (i.parentFolderID !== folderId) continue;
            if (i.type === "folder") await this._deleteSubtree(i.id);
            await this._storage.deleteItem(i.id);
        }
    }
}

type TransformOpts = {
    width?:   number;
    height?:  number;
    fit?:     ImageFit;
    format?:  ImageFormat;
    quality?: number;
};

function err(code: MediaErrorCode, message: string): MediaResponse<never> {
    return { ok: false, error: { code, message } };
}

async function toBytes(data: Blob | Uint8Array | ReadableStream<Uint8Array>): Promise<Uint8Array> {
    if (data instanceof Uint8Array) return data;
    if (data instanceof Blob)       return new Uint8Array(await data.arrayBuffer());
    return new Uint8Array(await new Response(data).arrayBuffer());
}

function classifyNonImage(mime: string): "video" | "audio" | "pdf" | "document" | "text" | "archive" | "other" {
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf") return "pdf";
    if (mime.startsWith("text/"))   return "text";
    if (mime === "application/zip" || mime === "application/x-tar") return "archive";
    if (mime.includes("word") || mime.includes("excel") || mime.includes("document")) return "document";
    return "other";
}
