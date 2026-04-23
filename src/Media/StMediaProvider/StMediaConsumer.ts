import type {
    FileMetadata,
    FolderMetadata,
    Media,
    MediaCreateFolderOptions,
    MediaDeleteItemOptions,
    MediaFormatImageOptions,
    MediaGetItemsOptions,
    MediaItem,
    MediaItemsPage,
    MediaResponse,
    MediaUpdateItemOptions,
    MediaUploadFileOptions,
} from "../Media";

/**
 * Browser-side companion for `StMediaProvider`. Implements the full `Media`
 * contract by HTTP-proxying every call to the provider's endpoints.
 *
 * Self-contained by contract (see `Media` in `../Media.ts`): every
 * identifier referenced by the method bodies is either `this`, a Web-standard
 * global, or a built-in — NO external function, NO external runtime import.
 * All state lives in `_baseUrl`, `limits` and `imageConfig` so the class
 * can be serialized through `constructor.toString()` + tagged-JSON and
 * rehydrated on the client.
 */
export class StMediaConsumer implements Media {

    readonly limits: Media["limits"] = {
        maxFileSize:       50 * 1024 * 1024,
        acceptedMimeTypes: "*",
    };

    readonly imageConfig: Media["imageConfig"] = {
        maxWidth:       3840,
        maxHeight:      3840,
        ladderWidths:   [320, 640, 960, 1280, 1920],
        ladderFormats:  ["webp"],
        defaultQuality: 80,
    };

    _baseUrl: string;

    constructor(baseUrl: string) {
        this._baseUrl = baseUrl.replace(/\/+$/, "") || "";
    }

    formatImageUrl(opts: MediaFormatImageOptions): URL {
        const loc = (globalThis as { location?: { origin: string } }).location;
        const origin = loc?.origin ?? "http://localhost";
        const u = new URL(opts.url, origin);
        if (opts.width   !== undefined) u.searchParams.set("w",   String(opts.width));
        if (opts.height  !== undefined) u.searchParams.set("h",   String(opts.height));
        if (opts.fit     !== undefined) u.searchParams.set("fit", opts.fit);
        if (opts.format  !== undefined) u.searchParams.set("fmt", opts.format);
        if (opts.quality !== undefined) u.searchParams.set("q",   String(opts.quality));
        return u;
    }

    async getItems(opts: MediaGetItemsOptions = {}): Promise<MediaResponse<MediaItemsPage>> {
        const params = new URLSearchParams();
        if (opts.folderID)   params.set("folderID",  opts.folderID);
        if (opts.accept)     params.set("accept",    opts.accept.join(","));
        if (opts.search)     params.set("search",    opts.search);
        if (opts.sortBy)     params.set("sortBy",    opts.sortBy);
        if (opts.sortOrder)  params.set("sortOrder", opts.sortOrder);
        if (opts.recursive)  params.set("recursive", "1");
        if (opts.pagination) {
            params.set("page",  String(opts.pagination.page));
            params.set("limit", String(opts.pagination.limit));
        }
        const res = await this._json<MediaItemsPage>(`${this._baseUrl}/items?${params}`);
        if (res.ok) res.data.items.forEach((i) => this._reviveItemDates(i));
        return res;
    }

    async getItem(id: string): Promise<MediaResponse<MediaItem>> {
        const res = await this._json<MediaItem>(`${this._baseUrl}/item?id=${encodeURIComponent(id)}`);
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    async uploadFile(opts: MediaUploadFileOptions): Promise<MediaResponse<FileMetadata>> {
        const form = new FormData();
        const blob = opts.data instanceof Blob
            ? opts.data
            : new Blob([opts.data as Uint8Array], opts.mimeType ? { type: opts.mimeType } : undefined);
        form.append("file", blob, opts.name);
        if (opts.folderID)  form.append("folderID",  opts.folderID);
        if (opts.mimeType)  form.append("mimeType",  opts.mimeType);
        if (opts.overwrite) form.append("overwrite", "1");
        const init: RequestInit = { method: "POST", body: form };
        if (opts.signal) init.signal = opts.signal;
        const res = await this._json<FileMetadata>(`${this._baseUrl}/file`, init);
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    async createFolder(opts: MediaCreateFolderOptions): Promise<MediaResponse<FolderMetadata>> {
        const res = await this._json<FolderMetadata>(`${this._baseUrl}/folder`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(opts),
        });
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    async updateItem(opts: MediaUpdateItemOptions): Promise<MediaResponse<MediaItem>> {
        const { id, ...patch } = opts;
        const res = await this._json<MediaItem>(`${this._baseUrl}/item?id=${encodeURIComponent(id)}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(patch),
        });
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    async deleteItem(opts: MediaDeleteItemOptions): Promise<MediaResponse<{ id: string }>> {
        const params = new URLSearchParams();
        params.set("id", opts.id);
        if (opts.recursive) params.set("recursive", "1");
        return this._json(`${this._baseUrl}/item?${params}`, { method: "DELETE" });
    }

    async _json<T>(url: string, init?: RequestInit): Promise<MediaResponse<T>> {
        try {
            const res = await fetch(url, init);
            if (!res.ok) {
                return { ok: false, error: { code: "storage_unavailable", message: `HTTP ${res.status}` } };
            }
            return await res.json() as MediaResponse<T>;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { ok: false, error: { code: "storage_unavailable", message } };
        }
    }

    _reviveItemDates(item: MediaItem): void {
        if (typeof item.createdAt === "string") item.createdAt = new Date(item.createdAt);
        if (typeof item.updatedAt === "string") item.updatedAt = new Date(item.updatedAt);
    }
}
