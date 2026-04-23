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
} from "../../../../../interfaces/Media";
import { MediaUrlBuilderConsumer } from "./MediaUrlBuilderConsumer";

/**
 * Browser-side companion for `MtMediaProvider`. Implements the full `Media`
 * contract by HTTP-proxying every call.
 *
 * Multi-tenant quirk — unlike `StMediaConsumer`, this class does not hold
 * credentials of its own. Reads go straight to the provider (media are
 * publicly readable); mutations fetch a fresh one-time token from a **local**
 * app endpoint (backed by `MtMediaTokenBroker`) before each call. The local
 * endpoint is the only place that holds the shared bucket secret.
 *
 * Self-contained by contract (see `Media` in `../Media.ts`): every
 * identifier referenced by the method bodies is either `this`, a Web-standard
 * global, or a built-in — NO external function, NO external runtime import.
 * All state lives in serializable fields so the class can be shipped to the
 * browser via `constructor.toString()` + tagged-JSON and rehydrated as-is.
 */
export class MediaConsumer extends MediaUrlBuilderConsumer implements Media {

    readonly limits: Media["limits"] = {
        maxFileSize:       50 * 1024 * 1024,
        acceptedMimeTypes: "*",
    };

    /** Absolute URL of the provider, e.g. `https://mediahub.example.com/mediahub`. */
    _providerUrl: string;

    /** Bucket ID this consumer reads/writes under. */
    _bucketID: string;

    /**
     * Local URL that mints a one-time mutation token. Typically
     * `/.mediahub/tokens`, served by `MtMediaTokenBroker`. Must be same-origin
     * so the app's auth cookie flows through.
     */
    _tokenUrl: string;

    constructor(config: {
        providerUrl: string;
        bucketID: string;
        tokenUrl?: string;
    }) {
        super();
        this._providerUrl = config.providerUrl.replace(/\/+$/, "");
        this._bucketID = config.bucketID;
        this._tokenUrl = config.tokenUrl ?? "/.mediahub/tokens";
    }

    // ── Reads (public, no token) ────────────────────────────────────────

    async getItems(opts: MediaGetItemsOptions = {}): Promise<MediaResponse<MediaItemsPage>> {
        const params = new URLSearchParams();
        params.set("bucket", this._bucketID);
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
        const res = await this._json<MediaItemsPage>(`${this._providerUrl}/items?${params}`);
        if (res.ok) res.data.items.forEach((i) => this._reviveItemDates(i));
        return res;
    }

    async getItem(id: string): Promise<MediaResponse<MediaItem>> {
        const url = `${this._providerUrl}/item?bucket=${encodeURIComponent(this._bucketID)}&id=${encodeURIComponent(id)}`;
        const res = await this._json<MediaItem>(url);
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    // ── Mutations (require a one-time token) ────────────────────────────

    async uploadFile(opts: MediaUploadFileOptions): Promise<MediaResponse<FileMetadata>> {
        const token = await this._fetchToken();
        if (!token) return this._tokenErr<FileMetadata>();

        const form = new FormData();
        const blob = opts.data instanceof Blob
            ? opts.data
            : new Blob([opts.data as unknown as BlobPart], opts.mimeType ? { type: opts.mimeType } : undefined);
        form.append("file", blob, opts.name);
        if (opts.folderID)  form.append("folderID",  opts.folderID);
        if (opts.mimeType)  form.append("mimeType",  opts.mimeType);
        if (opts.overwrite) form.append("overwrite", "1");

        const init: RequestInit = {
            method:  "POST",
            body:    form,
            headers: { Authorization: `MtMedia ${token}` },
        };
        if (opts.signal) init.signal = opts.signal;

        const res = await this._json<FileMetadata>(
            `${this._providerUrl}/file?bucket=${encodeURIComponent(this._bucketID)}`, init,
        );
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    async createFolder(opts: MediaCreateFolderOptions): Promise<MediaResponse<FolderMetadata>> {
        const token = await this._fetchToken();
        if (!token) return this._tokenErr<FolderMetadata>();

        const res = await this._json<FolderMetadata>(
            `${this._providerUrl}/folder?bucket=${encodeURIComponent(this._bucketID)}`, {
                method:  "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization:  `MtMedia ${token}`,
                },
                body: JSON.stringify(opts),
            },
        );
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    async updateItem(opts: MediaUpdateItemOptions): Promise<MediaResponse<MediaItem>> {
        const token = await this._fetchToken();
        if (!token) return this._tokenErr<MediaItem>();

        const { id, ...patch } = opts;
        const res = await this._json<MediaItem>(
            `${this._providerUrl}/item?bucket=${encodeURIComponent(this._bucketID)}&id=${encodeURIComponent(id)}`, {
                method:  "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization:  `MtMedia ${token}`,
                },
                body: JSON.stringify(patch),
            },
        );
        if (res.ok) this._reviveItemDates(res.data);
        return res;
    }

    async deleteItem(opts: MediaDeleteItemOptions): Promise<MediaResponse<{ id: string }>> {
        const token = await this._fetchToken();
        if (!token) return this._tokenErr<{ id: string }>();

        const params = new URLSearchParams();
        params.set("bucket", this._bucketID);
        params.set("id", opts.id);
        if (opts.recursive) params.set("recursive", "1");
        return this._json(`${this._providerUrl}/item?${params}`, {
            method:  "DELETE",
            headers: { Authorization: `MtMedia ${token}` },
        });
    }

    // ── Plumbing ─────────────────────────────────────────────────────────

    /**
     * Calls the local token broker. Returns `null` on any failure so callers
     * can surface a `storage_unavailable` error without throwing.
     */
    async _fetchToken(): Promise<string | null> {
        try {
            const res = await fetch(this._tokenUrl, { method: "GET" });
            if (!res.ok) return null;
            const body = await res.json() as { token?: string };
            return typeof body.token === "string" && body.token.length > 0 ? body.token : null;
        } catch {
            return null;
        }
    }

    async _json<T>(url: string, init?: RequestInit): Promise<MediaResponse<T>> {
        try {
            const res = await fetch(url, init);
            if (!res.ok) {
                // Try to parse a provider-shaped error, fall back to a generic.
                try {
                    const body = await res.json() as MediaResponse<T>;
                    if (body && typeof body === "object" && "ok" in body) return body;
                } catch { /* fallthrough */ }
                return { ok: false, error: { code: "storage_unavailable", message: `HTTP ${res.status}` } };
            }
            return await res.json() as MediaResponse<T>;
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return { ok: false, error: { code: "storage_unavailable", message } };
        }
    }

    _reviveItemDates(item: MediaItem): void {
        if (typeof item.createdAt === "string") item.createdAt = new Date(item.createdAt);
        if (typeof item.updatedAt === "string") item.updatedAt = new Date(item.updatedAt);
    }

    _tokenErr<T>(): MediaResponse<T> {
        return { ok: false, error: { code: "unauthorized", message: "Failed to obtain MtMedia token" } };
    }
}
