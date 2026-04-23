import type {
    FileMetadata,
    FolderMetadata,
    MediaCreateFolderOptions,
    MediaDeleteItemOptions,
    MediaGetItemsOptions,
    MediaItem,
    MediaItemsPage,
    MediaResponse,
    MediaUpdateItemOptions,
    MediaUploadFileOptions,
} from "../../../interfaces/Media";
import type { Runner } from "../../../interfaces/Runner";
import type { Authentication, DefaultRole, Subject } from "../../../interfaces/Authentication/Authentication";
import type { BucketConfig, BucketRepository } from "./interfaces/Bucket";
import type { BucketMediaStorage } from "./interfaces/BucketMediaStorage";
import type { ProviderContext } from "./interfaces/ProviderContext";
import type { MtMediaProviderConfig } from "../types/types";
import { InMemoryBucketMediaStorage } from "../default-implementation/InMemoryBucketMediaStorage";
import { redirect } from "../../../utilities/html";
import { classifyNonImage, err, mimeAccepted, toBytes } from "./core/utils";
import { hasTransform, parseTransform, readImageDimensions, transformImage } from "./core/image/imageTransformer";
import registerEndpoints from "./registerEndpoints";

// Re-export the surface types consumers import alongside the class so
// `import { MtMediaProvider, MtMediaBucketInfo } from ".../MtMediaProvider"`
// keeps working after the type split.
export type { MtMediaBucketInfo, MtMediaMintResponse, MtMediaProviderConfig } from "../types/types";

/**
 * Multi-tenant Media provider. One deployment serves many apps, each bound
 * to a `BucketConfig`; media inside a bucket are publicly readable but
 * mutations require a short-lived, one-time token minted via the shared
 * bucket secret.
 *
 * Mount inside its own group, e.g.
 * `runner.group("/mediahub", (r) => new MtMediaProvider(r, cfg))`.
 *
 * This class owns state (token map, config) and business operations
 * (`uploadFile`, `createFolder`, …). Route wiring lives in
 * `registerEndpoints.ts`; HTTP handlers under `api/*`; HTML pages under
 * `static/*`; interfaces under `interfaces/*`. The image pipeline is in
 * `core/image/imageTransformer.ts`.
 *
 *  Public reads (no auth, CORS-allowed):
 *   - `GET /bucket?bucket=…`       → `MtMediaBucketInfo`
 *   - `GET /items?bucket=…`
 *   - `GET /item?bucket=…&id=…`
 *   - `GET /file?bucket=…&id=…`    (supports ?w/h/fit/fmt/q image transform)
 *
 *  Mutations (require `Authorization: MtMedia <token>`):
 *   - `POST /file?bucket=…`
 *   - `POST /folder?bucket=…`
 *   - `PATCH /item?bucket=…&id=…`
 *   - `DELETE /item?bucket=…&id=…`
 *
 *  Token issuance (consumer-app server side, with `X-Bucket-Secret`):
 *   - `POST /mint?bucket=…`        → `MtMediaMintResponse`
 *
 *  Preflight:
 *   - `OPTIONS *`                  → CORS preflight
 *
 *  Admin UI (static HTML under `./static`, populated client-side):
 *   - `GET /admin` (redirect) → `GET /admin/dashboard.html`
 *   - `GET /bucket/dashboard.html` / `config.html` / `limitation.html`
 *   - `GET /forbidden.html`
 *   - `GET /admin/api/buckets` + `/admin/api/session`       (admin-gated)
 *   - `POST /admin/buckets(/update|/rotate|/delete)`        (admin-gated)
 *
 *  Static assets (provider-owned):
 *   - `GET /assets/w13c.js`        → bundled web components
 *   - `GET /assets/style.css`      → `src/ui/default.css`
 *
 * Server-only: owns raw bytes + bucket secrets; pulls `sharp` in via
 * `core/image/imageTransformer.ts`.
 */
export class MediaProvider<Role extends string = DefaultRole> implements ProviderContext {

    readonly admin: Authentication<Role>;
    readonly adminRole: Role;
    readonly buckets: BucketRepository;
    readonly storage: BucketMediaStorage;
    readonly prefix: string;
    readonly defaultMaxFileSize: number;
    readonly defaultAcceptedMimeTypes: string[] | "*";
    readonly tokenTtlMs: number;
    readonly corsAllowedOrigins: string[] | "*";

    private readonly _maxPendingTokens: number;

    /** Pending one-time mutation tokens. Map preserves insertion order for FIFO eviction. */
    private readonly _pendingTokens = new Map<string, { bucketID: string; expiresAt: number }>();

    constructor(runner: Runner, config: MtMediaProviderConfig<Role>) {
        this.admin                     = config.admin;
        this.adminRole                 = config.adminRole ?? ("admin" as Role);
        this.buckets                   = config.buckets;
        this.storage                   = config.storage ?? new InMemoryBucketMediaStorage();
        this.prefix                    = runner.basePath === "/" ? "" : runner.basePath.replace(/\/+$/, "");
        this.defaultMaxFileSize        = config.defaultMaxFileSize ?? 50 * 1024 * 1024;
        this.defaultAcceptedMimeTypes  = config.defaultAcceptedMimeTypes ?? "*";
        this.tokenTtlMs                = config.tokenTtlMs ?? 60_000;
        this.corsAllowedOrigins        = config.corsAllowedOrigins ?? "*";
        this._maxPendingTokens         = config.maxPendingTokens ?? 10_000;

        registerEndpoints(this, runner);
    }

    // ── CORS ─────────────────────────────────────────────────────────────

    resolveAllowedOrigin(origin: string | null): string | null {
        if (!origin) return null;
        if (this.corsAllowedOrigins === "*") return "*";
        return this.corsAllowedOrigins.includes(origin) ? origin : null;
    }

    // ── Token lifecycle ──────────────────────────────────────────────────

    rememberToken(token: string, bucketID: string, expiresAt: number): void {
        // Lazy prune: drop the oldest expired entries before inserting.
        if (this._pendingTokens.size >= this._maxPendingTokens) {
            const now = Date.now();
            for (const [t, e] of this._pendingTokens) {
                if (e.expiresAt <= now) this._pendingTokens.delete(t);
                if (this._pendingTokens.size < this._maxPendingTokens) break;
            }
            // Still full → FIFO-evict the oldest entry.
            if (this._pendingTokens.size >= this._maxPendingTokens) {
                const oldest = this._pendingTokens.keys().next().value;
                if (oldest !== undefined) this._pendingTokens.delete(oldest);
            }
        }
        this._pendingTokens.set(token, { bucketID, expiresAt });
    }

    consumeToken(raw: string): { bucketID: string } | null {
        const entry = this._pendingTokens.get(raw);
        if (!entry) return null;
        this._pendingTokens.delete(raw);
        if (entry.expiresAt <= Date.now()) return null;
        return { bucketID: entry.bucketID };
    }

    requireToken(req: Request, bucketID: string): MediaResponse<never> | null {
        const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
        if (!header?.startsWith("MtMedia ")) return err("unauthorized", "Missing MtMedia token");
        const raw = header.slice(8).trim();
        const consumed = this.consumeToken(raw);
        if (!consumed) return err("unauthorized", "Invalid or expired token");
        if (consumed.bucketID !== bucketID) return err("forbidden", "Token bucket mismatch");
        return null;
    }

    // ── Admin gate ───────────────────────────────────────────────────────

    async requireAdmin(req: Request): Promise<Subject<Role> | Response> {
        const subject = await this.admin.getSubject(req);
        if (!subject) return redirect(this.admin.buildLoginUrl(`${this.prefix}/admin/dashboard.html`));
        if (subject.role !== this.adminRole) {
            const forbidden = Bun.file(new URL("./static/forbidden.html", import.meta.url).pathname);
            return new Response(forbidden, {
                status:  403,
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }
        return subject;
    }

    // ── Business operations ──────────────────────────────────────────────

    async getItems(bucketID: string, opts: MediaGetItemsOptions = {}): Promise<MediaResponse<MediaItemsPage>> {
        const folderID = opts.folderID ?? null;
        const page  = opts.pagination?.page  ?? 1;
        const limit = opts.pagination?.limit ?? 100;

        const all = await this.storage.listItems(bucketID);
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

    async getItem(bucketID: string, id: string): Promise<MediaResponse<MediaItem>> {
        const item = await this.storage.getItem(bucketID, id);
        if (!item) return err("not_found", `No item with id "${id}"`);
        return { ok: true, data: item };
    }

    async uploadFile(bucket: BucketConfig, opts: MediaUploadFileOptions): Promise<MediaResponse<FileMetadata>> {
        const parent = opts.folderID ?? null;
        if (parent !== null && !(await this.storage.getItem(bucket.id, parent))) {
            return err("destination_not_found", `No folder with id "${parent}"`);
        }
        if (!opts.overwrite && await this._nameTaken(bucket.id, opts.name, parent)) {
            return err("conflict", `"${opts.name}" already exists in that folder`);
        }

        const bytes = await toBytes(opts.data);
        if (bytes.byteLength > bucket.maxFileSize) {
            return err("file_too_large", `File exceeds ${bucket.maxFileSize} bytes`);
        }

        const mimeType = opts.mimeType ?? "application/octet-stream";
        if (!mimeAccepted(bucket.acceptedMimeTypes, mimeType)) {
            return err("unsupported_mime_type", `"${mimeType}" not allowed by bucket policy`);
        }

        const id = crypto.randomUUID();
        const now = new Date();
        const absoluteURL = `${this.prefix}/file?bucket=${encodeURIComponent(bucket.id)}&id=${id}`;

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
            const dims = await readImageDimensions(bytes);
            stored = { ...base, type: "image", imageInfo: dims };
        } else {
            stored = { ...base, type: classifyNonImage(mimeType) };
        }

        await this.storage.putItem(bucket.id, stored);
        await this.storage.putBytes(bucket.id, id, bytes);
        return { ok: true, data: stored };
    }

    async createFolder(bucketID: string, opts: MediaCreateFolderOptions): Promise<MediaResponse<FolderMetadata>> {
        const parent = opts.parentFolderID ?? null;
        if (parent !== null && !(await this.storage.getItem(bucketID, parent))) {
            return err("destination_not_found", `No folder with id "${parent}"`);
        }
        if (await this._nameTaken(bucketID, opts.name, parent)) {
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
        await this.storage.putItem(bucketID, folder);
        return { ok: true, data: folder };
    }

    async updateItem(bucketID: string, opts: MediaUpdateItemOptions): Promise<MediaResponse<MediaItem>> {
        const item = await this.storage.getItem(bucketID, opts.id);
        if (!item) return err("not_found", `No item with id "${opts.id}"`);

        const nextParent = opts.parentFolderID === undefined
            ? item.parentFolderID
            : (opts.parentFolderID || null);
        const nextName = opts.name ?? item.name;

        if (opts.parentFolderID && !(await this.storage.getItem(bucketID, opts.parentFolderID))) {
            return err("destination_not_found", `No folder with id "${opts.parentFolderID}"`);
        }
        if ((opts.name || opts.parentFolderID) && await this._nameTaken(bucketID, nextName, nextParent, item.id)) {
            return err("conflict", `"${nextName}" already exists in that folder`);
        }
        if (item.type === "folder" && opts.parentFolderID && await this._isDescendant(bucketID, opts.parentFolderID, item.id)) {
            return err("validation_error", `Cannot move a folder into its own descendant`);
        }

        const updated = { ...item, name: nextName, parentFolderID: nextParent, updatedAt: new Date() } as MediaItem;
        await this.storage.putItem(bucketID, updated);
        return { ok: true, data: updated };
    }

    async deleteItem(bucketID: string, opts: MediaDeleteItemOptions): Promise<MediaResponse<{ id: string }>> {
        const item = await this.storage.getItem(bucketID, opts.id);
        if (!item) return err("not_found", `No item with id "${opts.id}"`);

        if (item.type === "folder") {
            const all = await this.storage.listItems(bucketID);
            const hasChildren = all.some((i) => i.parentFolderID === opts.id);
            if (hasChildren && !opts.recursive) {
                return err("folder_not_empty", `Folder "${item.name}" is not empty`);
            }
            if (opts.recursive) await this._deleteSubtree(bucketID, opts.id);
        }
        await this.storage.deleteItem(bucketID, opts.id);
        return { ok: true, data: { id: opts.id } };
    }

    async serveFileBytes(bucketID: string, id: string, url: URL): Promise<Response> {
        const item = await this.storage.getItem(bucketID, id);
        if (!item || item.type === "folder") return new Response("Not found", { status: 404 });

        const bytes = await this.storage.getBytes(bucketID, id);
        if (!bytes) return new Response("Not found", { status: 404 });

        const t = parseTransform(url);
        let out = bytes;
        let mime = item.mimeType;

        if (item.type === "image" && hasTransform(t)) {
            try {
                const transformed = await transformImage(bytes, t);
                out  = transformed.bytes;
                mime = transformed.mimeType;
            } catch (e) {
                console.error("[MtMediaProvider] image transform failed, serving original:", e);
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

    // ── Tree helpers ─────────────────────────────────────────────────────

    private async _nameTaken(bucketID: string, name: string, parentFolderID: string | null, excludeId?: string): Promise<boolean> {
        const all = await this.storage.listItems(bucketID);
        for (const i of all) {
            if (i.id === excludeId) continue;
            if (i.parentFolderID === parentFolderID && i.name === name) return true;
        }
        return false;
    }

    private async _isDescendant(bucketID: string, candidateDescendantId: string, ancestorId: string): Promise<boolean> {
        let cursor: string | null = candidateDescendantId;
        while (cursor) {
            if (cursor === ancestorId) return true;
            const node = await this.storage.getItem(bucketID, cursor);
            cursor = node?.parentFolderID ?? null;
        }
        return false;
    }

    private async _deleteSubtree(bucketID: string, folderId: string): Promise<void> {
        const all = await this.storage.listItems(bucketID);
        for (const i of all) {
            if (i.parentFolderID !== folderId) continue;
            if (i.type === "folder") await this._deleteSubtree(bucketID, i.id);
            await this.storage.deleteItem(bucketID, i.id);
        }
    }
}
