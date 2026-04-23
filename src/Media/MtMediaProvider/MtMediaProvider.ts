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
import type { Authentication, DefaultRole, Subject } from "../../Authentication/interfaces/Authentication";
import type { RouteHandler } from "../../Runner/Runner";
import type { BucketConfig, BucketRepository } from "./Bucket";
import type { BucketMediaStorage } from "./BucketMediaStorage";
import { InMemoryBucketMediaStorage } from "./InMemoryBucketMediaStorage";
import { escapeHtml, htmlResponse, redirect } from "../../utilities/html";
import { randomBase64Url, sha256Hex } from "../../utilities/crypto";

/**
 * Public, client-safe view of a bucket. Returned by `GET /bucket` so
 * Consumer apps can self-configure `limits` without holding the secret.
 * `secretHash`, `createdAt` and `updatedAt` are intentionally omitted.
 */
export type MtMediaBucketInfo = {
    id: string;
    name: string;
    maxFileSize: number;
    acceptedMimeTypes: string[] | "*";
};

/** Response shape of `POST /mint`. */
export type MtMediaMintResponse = {
    token: string;
    /** Epoch ms at which the token stops being valid. */
    expiresAt: number;
};

export type MtMediaProviderConfig<Role extends string = DefaultRole> = {
    /**
     * Identity provider gating the admin UI. The subject MUST have
     * `role === adminRole` to create, rotate or delete buckets.
     */
    admin: Authentication<Role>;
    /** Role allowed on the admin UI. Defaults to `"admin"`. */
    adminRole?: Role;
    /** Persistence layer for bucket configurations. */
    buckets: BucketRepository;
    /** Media storage partitioned by bucket. Defaults to `InMemoryBucketMediaStorage`. */
    storage?: BucketMediaStorage;

    /** Default upload cap assigned to new buckets. Defaults to 50 MiB. */
    defaultMaxFileSize?: number;
    /** Default MIME allow-list for new buckets. Defaults to `"*"`. */
    defaultAcceptedMimeTypes?: string[] | "*";

    /** TTL of mutation tokens, in ms. Defaults to 60 000 (1 min). */
    tokenTtlMs?: number;
    /** Max pending tokens kept in memory. Oldest dropped past the cap. Defaults to 10 000. */
    maxPendingTokens?: number;

    /**
     * Origins allowed to call the provider cross-origin. Pass `"*"` to let
     * any origin hit the API (fine for demo / development; medias are
     * public anyway). Pass an explicit allow-list in production so that
     * only your consumer apps can mint tokens and mutate.
     *
     * Applied both to the preflight (`OPTIONS`) responses and to every
     * actual response as `Access-Control-Allow-Origin`. Defaults to `"*"`.
     */
    corsAllowedOrigins?: string[] | "*";

    /**
     * URL pointing at a JS bundle that registers the `src/ui/*` custom
     * elements (`<p9r-button>`, `<p9r-table>`, `<p9r-form-dialog>`, …). The
     * admin page loads it via `<script type="module">`. Leave undefined
     * to fall back to a bare HTML admin (no web components).
     */
    uiScriptUrl?: string;

    /**
     * URL of a CSS file that declares the design tokens expected by the
     * `src/ui/*` components (`--bg-*`, `--text-*`, `--primary-*`, …). The
     * admin page loads it via `<link rel="stylesheet">`. Leave undefined
     * to fall back to a bare HTML admin.
     */
    uiStyleUrl?: string;
};

/**
 * Multi-tenant Media provider. One deployment serves many apps, each bound
 * to a `BucketConfig`; media inside a bucket are publicly readable but
 * mutations require a short-lived, one-time token minted via the shared
 * bucket secret.
 *
 * Mount inside its own group, e.g.
 * `runner.group("/mediahub", (r) => new MtMediaProvider(r, cfg))`.
 *
 * Routes registered on the runner (bucket id passed as `?bucket=…` to keep
 * routing flat and avoid path-param parsing):
 *
 *  Public reads (no auth, CORS-allowed):
 *   - `GET /bucket?bucket=…`       → `MtMediaBucketInfo` (id, name, limits)
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
 *   - `POST /mint?bucket=…`  → `MtMediaMintResponse` (token, expiresAt)
 *
 *  Preflight:
 *   - `OPTIONS *` — default endpoint responding with CORS headers.
 *
 *  Admin UI (requires `admin` session with `adminRole`):
 *   - `GET /admin`
 *   - `POST /admin/buckets`
 *   - `POST /admin/buckets/update?id=…`
 *   - `POST /admin/buckets/rotate?id=…`
 *   - `POST /admin/buckets/delete?id=…`
 *
 * Server-only: uses `sharp` and owns raw bytes + bucket secrets.
 */
export class MtMediaProvider<Role extends string = DefaultRole> {

    private readonly _admin: Authentication<Role>;
    private readonly _adminRole: Role;
    private readonly _buckets: BucketRepository;
    private readonly _storage: BucketMediaStorage;
    private readonly _prefix: string;
    private readonly _defaultMaxFileSize: number;
    private readonly _defaultAcceptedMimeTypes: string[] | "*";
    private readonly _tokenTtlMs: number;
    private readonly _maxPendingTokens: number;
    private readonly _corsAllowedOrigins: string[] | "*";
    private readonly _uiScriptUrl?: string;
    private readonly _uiStyleUrl?: string;

    /** Pending one-time mutation tokens. Map preserves insertion order for FIFO eviction. */
    private readonly _pendingTokens = new Map<string, { bucketID: string; expiresAt: number }>();

    constructor(runner: Runner, config: MtMediaProviderConfig<Role>) {
        this._admin = config.admin;
        this._adminRole = config.adminRole ?? ("admin" as Role);
        this._buckets = config.buckets;
        this._storage = config.storage ?? new InMemoryBucketMediaStorage();
        this._prefix = runner.basePath === "/" ? "" : runner.basePath.replace(/\/+$/, "");
        this._defaultMaxFileSize = config.defaultMaxFileSize ?? 50 * 1024 * 1024;
        this._defaultAcceptedMimeTypes = config.defaultAcceptedMimeTypes ?? "*";
        this._tokenTtlMs = config.tokenTtlMs ?? 60_000;
        this._maxPendingTokens = config.maxPendingTokens ?? 10_000;
        this._corsAllowedOrigins = config.corsAllowedOrigins ?? "*";
        if (config.uiScriptUrl) this._uiScriptUrl = config.uiScriptUrl;
        if (config.uiStyleUrl)  this._uiStyleUrl  = config.uiStyleUrl;

        const cors = (h: RouteHandler) => this._withCors(h);

        // Public reads
        runner.get   ("/bucket", cors((req) => this._handleBucketInfo(req)));
        runner.get   ("/items",  cors((req) => this._handleList(req)));
        runner.get   ("/item",   cors((req) => this._handleGet(req)));
        runner.get   ("/file",   cors((req) => this._handleFile(req)));

        // Token issuance for consumer apps
        runner.post  ("/mint",   cors((req) => this._handleMint(req)));

        // Mutations (gated by one-time token)
        runner.post  ("/file",   cors((req) => this._handleUpload(req)));
        runner.post  ("/folder", cors((req) => this._handleCreateFolder(req)));
        runner.patch ("/item",   cors((req) => this._handleUpdate(req)));
        runner.delete("/item",   cors((req) => this._handleDelete(req)));

        // Preflight catches every OPTIONS request under the provider's prefix.
        runner.setDefaultEndpoint("OPTIONS", (req) => this._handlePreflight(req));

        // Admin UI — same-origin; CORS headers are still attached so an
        // operator opening the admin page from a different port on localhost
        // doesn't get surprised.
        runner.get   ("/admin",                  cors((req) => this._adminHome(req)));
        runner.post  ("/admin/buckets",          cors((req) => this._adminCreateBucket(req)));
        runner.post  ("/admin/buckets/update",   cors((req) => this._adminUpdateBucket(req)));
        runner.post  ("/admin/buckets/rotate",   cors((req) => this._adminRotateSecret(req)));
        runner.post  ("/admin/buckets/delete",   cors((req) => this._adminDeleteBucket(req)));
    }

    // ── CORS ─────────────────────────────────────────────────────────────

    /**
     * Resolves the value to echo in `Access-Control-Allow-Origin` for the
     * given request origin. Returns `null` if CORS should NOT be advertised
     * (request is same-origin or the origin isn't allow-listed).
     */
    private _resolveAllowedOrigin(origin: string | null): string | null {
        if (!origin) return null;
        if (this._corsAllowedOrigins === "*") return "*";
        return this._corsAllowedOrigins.includes(origin) ? origin : null;
    }

    private _applyCorsHeaders(req: Request, res: Response): Response {
        const allow = this._resolveAllowedOrigin(req.headers.get("origin"));
        if (!allow) return res;
        res.headers.set("Access-Control-Allow-Origin", allow);
        res.headers.append("Vary", "Origin");
        return res;
    }

    private _withCors(handler: RouteHandler): RouteHandler {
        return async (req) => this._applyCorsHeaders(req, await handler(req));
    }

    private _handlePreflight(req: Request): Response {
        const allow = this._resolveAllowedOrigin(req.headers.get("origin"));
        if (!allow) return new Response(null, { status: 204 });

        const reqHeaders = req.headers.get("access-control-request-headers")
            ?? "Authorization, Content-Type, X-Bucket-Secret";

        return new Response(null, {
            status:  204,
            headers: {
                "Access-Control-Allow-Origin":  allow,
                "Vary":                         "Origin",
                "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": reqHeaders,
                "Access-Control-Max-Age":       "86400",
            },
        });
    }

    // ── Storage operations (also exposed for in-process callers) ─────────

    async getItems(bucketID: string, opts: MediaGetItemsOptions = {}): Promise<MediaResponse<MediaItemsPage>> {
        const folderID = opts.folderID ?? null;
        const page  = opts.pagination?.page  ?? 1;
        const limit = opts.pagination?.limit ?? 100;

        const all = await this._storage.listItems(bucketID);
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
        const item = await this._storage.getItem(bucketID, id);
        if (!item) return err("not_found", `No item with id "${id}"`);
        return { ok: true, data: item };
    }

    async uploadFile(bucket: BucketConfig, opts: MediaUploadFileOptions): Promise<MediaResponse<FileMetadata>> {
        const parent = opts.folderID ?? null;
        if (parent !== null && !(await this._storage.getItem(bucket.id, parent))) {
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
        const absoluteURL = `${this._prefix}/file?bucket=${encodeURIComponent(bucket.id)}&id=${id}`;

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

        await this._storage.putItem(bucket.id, stored);
        await this._storage.putBytes(bucket.id, id, bytes);
        return { ok: true, data: stored };
    }

    async createFolder(bucketID: string, opts: MediaCreateFolderOptions): Promise<MediaResponse<FolderMetadata>> {
        const parent = opts.parentFolderID ?? null;
        if (parent !== null && !(await this._storage.getItem(bucketID, parent))) {
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
        await this._storage.putItem(bucketID, folder);
        return { ok: true, data: folder };
    }

    async updateItem(bucketID: string, opts: MediaUpdateItemOptions): Promise<MediaResponse<MediaItem>> {
        const item = await this._storage.getItem(bucketID, opts.id);
        if (!item) return err("not_found", `No item with id "${opts.id}"`);

        const nextParent = opts.parentFolderID === undefined
            ? item.parentFolderID
            : (opts.parentFolderID || null);
        const nextName = opts.name ?? item.name;

        if (opts.parentFolderID && !(await this._storage.getItem(bucketID, opts.parentFolderID))) {
            return err("destination_not_found", `No folder with id "${opts.parentFolderID}"`);
        }
        if ((opts.name || opts.parentFolderID) && await this._nameTaken(bucketID, nextName, nextParent, item.id)) {
            return err("conflict", `"${nextName}" already exists in that folder`);
        }
        if (item.type === "folder" && opts.parentFolderID && await this._isDescendant(bucketID, opts.parentFolderID, item.id)) {
            return err("validation_error", `Cannot move a folder into its own descendant`);
        }

        const updated = { ...item, name: nextName, parentFolderID: nextParent, updatedAt: new Date() } as MediaItem;
        await this._storage.putItem(bucketID, updated);
        return { ok: true, data: updated };
    }

    async deleteItem(bucketID: string, opts: MediaDeleteItemOptions): Promise<MediaResponse<{ id: string }>> {
        const item = await this._storage.getItem(bucketID, opts.id);
        if (!item) return err("not_found", `No item with id "${opts.id}"`);

        if (item.type === "folder") {
            const all = await this._storage.listItems(bucketID);
            const hasChildren = all.some((i) => i.parentFolderID === opts.id);
            if (hasChildren && !opts.recursive) {
                return err("folder_not_empty", `Folder "${item.name}" is not empty`);
            }
            if (opts.recursive) await this._deleteSubtree(bucketID, opts.id);
        }
        await this._storage.deleteItem(bucketID, opts.id);
        return { ok: true, data: { id: opts.id } };
    }

    // ── HTTP handlers — public reads ─────────────────────────────────────

    private async _handleBucketInfo(req: Request): Promise<Response> {
        const bucketID = new URL(req.url).searchParams.get("bucket");
        if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
        const bucket = await this._buckets.getById(bucketID);
        if (!bucket) return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });
        const info: MtMediaBucketInfo = {
            id:                bucket.id,
            name:              bucket.name,
            maxFileSize:       bucket.maxFileSize,
            acceptedMimeTypes: bucket.acceptedMimeTypes,
        };
        return Response.json({ ok: true, data: info });
    }

    private async _handleList(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
        if (!(await this._buckets.getById(bucketID))) {
            return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });
        }

        const accept = url.searchParams.get("accept");
        const result = await this.getItems(bucketID, {
            folderID:  url.searchParams.get("folderID") ?? undefined,
            accept:    accept ? (accept.split(",") as MediaItemType[]) : undefined,
            search:    url.searchParams.get("search") ?? undefined,
            sortBy:    (url.searchParams.get("sortBy")    as MediaGetItemsOptions["sortBy"])    ?? undefined,
            sortOrder: (url.searchParams.get("sortOrder") as MediaGetItemsOptions["sortOrder"]) ?? undefined,
            pagination: {
                page:  parseInt(url.searchParams.get("page")  ?? "1",   10),
                limit: parseInt(url.searchParams.get("limit") ?? "100", 10),
            },
        });
        if (result.ok) result.data.items.forEach((i) => this._qualifyItem(i, req));
        return Response.json(result);
    }

    private async _handleGet(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        const id = url.searchParams.get("id");
        if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
        if (!id)       return Response.json(err("validation_error", "Missing id"),     { status: 400 });
        const result = await this.getItem(bucketID, id);
        if (result.ok) this._qualifyItem(result.data, req);
        return Response.json(result);
    }

    private async _handleFile(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        const id = url.searchParams.get("id");
        if (!bucketID || !id) return new Response("Missing bucket or id", { status: 400 });

        const item = await this._storage.getItem(bucketID, id);
        if (!item || item.type === "folder") return new Response("Not found", { status: 404 });

        const bytes = await this._storage.getBytes(bucketID, id);
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

    // ── HTTP handlers — token lifecycle ─────────────────────────────────

    private async _handleMint(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        if (!bucketID) return Response.json({ error: "missing_bucket" }, { status: 400 });

        const bucket = await this._buckets.getById(bucketID);
        if (!bucket) return Response.json({ error: "bucket_not_found" }, { status: 404 });

        const provided = req.headers.get("x-bucket-secret") ?? req.headers.get("X-Bucket-Secret");
        if (!provided) return Response.json({ error: "missing_secret" }, { status: 401 });

        const hash = await sha256Hex(provided);
        if (!constantTimeEquals(hash, bucket.secretHash)) {
            return Response.json({ error: "invalid_secret" }, { status: 401 });
        }

        const token = randomBase64Url(24);
        const expiresAt = Date.now() + this._tokenTtlMs;
        this._rememberToken(token, bucketID, expiresAt);
        return Response.json({ token, expiresAt });
    }

    /**
     * Consumes one token, returning the bucket it was minted for, or `null`
     * if it is unknown/expired. On success the token is removed (one-time).
     */
    private _consumeToken(raw: string): { bucketID: string } | null {
        const entry = this._pendingTokens.get(raw);
        if (!entry) return null;
        this._pendingTokens.delete(raw);
        if (entry.expiresAt <= Date.now()) return null;
        return { bucketID: entry.bucketID };
    }

    private _rememberToken(token: string, bucketID: string, expiresAt: number): void {
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

    private _requireToken(req: Request, bucketID: string): MediaResponse<never> | null {
        const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
        if (!header?.startsWith("MtMedia ")) return err("unauthorized", "Missing MtMedia token");
        const raw = header.slice(8).trim();
        const consumed = this._consumeToken(raw);
        if (!consumed) return err("unauthorized", "Invalid or expired token");
        if (consumed.bucketID !== bucketID) return err("forbidden", "Token bucket mismatch");
        return null;
    }

    // ── HTTP handlers — mutations ────────────────────────────────────────

    private async _handleUpload(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
        const bucket = await this._buckets.getById(bucketID);
        if (!bucket) return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });

        const gate = this._requireToken(req, bucketID);
        if (gate) return Response.json(gate, { status: 401 });

        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
            return Response.json(err("validation_error", "Missing file"), { status: 400 });
        }
        const folderID = form.get("folderID")?.toString() || undefined;
        const mimeTypeOverride = form.get("mimeType")?.toString() || undefined;
        const overwrite = form.get("overwrite") === "1";
        const result = await this.uploadFile(bucket, {
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
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
        if (!(await this._buckets.getById(bucketID))) {
            return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });
        }

        const gate = this._requireToken(req, bucketID);
        if (gate) return Response.json(gate, { status: 401 });

        const body = await req.json() as MediaCreateFolderOptions;
        if (!body?.name) return Response.json(err("invalid_name", "Name is required"), { status: 400 });
        return Response.json(await this.createFolder(bucketID, body));
    }

    private async _handleUpdate(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        const id = url.searchParams.get("id");
        if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
        if (!id)       return Response.json(err("validation_error", "Missing id"),     { status: 400 });

        const gate = this._requireToken(req, bucketID);
        if (gate) return Response.json(gate, { status: 401 });

        const body = await req.json() as Omit<MediaUpdateItemOptions, "id">;
        const result = await this.updateItem(bucketID, { id, ...body });
        if (result.ok) this._qualifyItem(result.data, req);
        return Response.json(result);
    }

    private async _handleDelete(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const bucketID = url.searchParams.get("bucket");
        const id = url.searchParams.get("id");
        if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
        if (!id)       return Response.json(err("validation_error", "Missing id"),     { status: 400 });

        const gate = this._requireToken(req, bucketID);
        if (gate) return Response.json(gate, { status: 401 });

        const recursive = url.searchParams.get("recursive") === "true" || url.searchParams.get("recursive") === "1";
        return Response.json(await this.deleteItem(bucketID, { id, recursive }));
    }

    // ── HTTP handlers — admin UI ─────────────────────────────────────────

    private async _requireAdmin(req: Request): Promise<Subject<Role> | Response> {
        const subject = await this._admin.getSubject(req);
        if (!subject) return redirect(this._admin.buildLoginUrl(`${this._prefix}/admin`));
        if (subject.role !== this._adminRole) {
            return htmlResponse(renderAdminErrorPage(`Rôle "${String(this._adminRole)}" requis.`), 403);
        }
        return subject;
    }

    private async _adminHome(req: Request): Promise<Response> {
        const gate = await this._requireAdmin(req);
        if (gate instanceof Response) return gate;

        const buckets = await this._buckets.list();
        const url = new URL(req.url);
        return htmlResponse(renderAdminPage({
            subject:        gate,
            buckets,
            basePath:       this._prefix,
            adminLogoutUrl: this._admin.logoutUrl,
            newSecret:      url.searchParams.get("newSecret")    ?? undefined,
            newBucketId:    url.searchParams.get("newBucketId")  ?? undefined,
            error:          url.searchParams.get("error")        ?? undefined,
            uiScriptUrl:    this._uiScriptUrl,
            uiStyleUrl:     this._uiStyleUrl,
        }));
    }

    private async _adminCreateBucket(req: Request): Promise<Response> {
        const gate = await this._requireAdmin(req);
        if (gate instanceof Response) return gate;

        const form = await req.formData();
        const name = (form.get("name")?.toString() ?? "").trim();
        if (!name) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Nom requis.")}`);
        if (name.length > 120) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Nom trop long.")}`);

        const secret = randomBase64Url(32);
        const bucket = await this._buckets.create({
            name,
            secretHash:         await sha256Hex(secret),
            maxFileSize:        this._defaultMaxFileSize,
            acceptedMimeTypes:  this._defaultAcceptedMimeTypes,
        });

        return redirect(`${this._prefix}/admin?newSecret=${encodeURIComponent(secret)}&newBucketId=${encodeURIComponent(bucket.id)}`);
    }

    private async _adminUpdateBucket(req: Request): Promise<Response> {
        const gate = await this._requireAdmin(req);
        if (gate instanceof Response) return gate;

        const id = new URL(req.url).searchParams.get("id");
        if (!id) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Bucket id manquant.")}`);
        const existing = await this._buckets.getById(id);
        if (!existing) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Bucket inconnu.")}`);

        const form = await req.formData();
        const nextName = (form.get("name")?.toString() ?? "").trim();
        const maxRaw = form.get("maxFileSize")?.toString().trim() ?? "";
        const mimeRaw = form.get("acceptedMimeTypes")?.toString().trim() ?? "";

        if (!nextName) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Nom requis.")}`);
        if (nextName.length > 120) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Nom trop long.")}`);

        const patch: Partial<Omit<BucketConfig, "id" | "createdAt">> = { name: nextName };
        if (maxRaw) {
            const n = parseInt(maxRaw, 10);
            if (Number.isNaN(n) || n <= 0) {
                return redirect(`${this._prefix}/admin?error=${encodeURIComponent("maxFileSize invalide.")}`);
            }
            patch.maxFileSize = n;
        }
        if (mimeRaw) {
            patch.acceptedMimeTypes = mimeRaw === "*"
                ? "*"
                : mimeRaw.split(",").map((s) => s.trim()).filter(Boolean);
        }

        await this._buckets.update(id, patch);
        return redirect(`${this._prefix}/admin`);
    }

    private async _adminRotateSecret(req: Request): Promise<Response> {
        const gate = await this._requireAdmin(req);
        if (gate instanceof Response) return gate;

        const id = new URL(req.url).searchParams.get("id");
        if (!id) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Bucket id manquant.")}`);
        const existing = await this._buckets.getById(id);
        if (!existing) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Bucket inconnu.")}`);

        const secret = randomBase64Url(32);
        await this._buckets.update(id, { secretHash: await sha256Hex(secret) });
        return redirect(`${this._prefix}/admin?newSecret=${encodeURIComponent(secret)}&newBucketId=${encodeURIComponent(id)}`);
    }

    private async _adminDeleteBucket(req: Request): Promise<Response> {
        const gate = await this._requireAdmin(req);
        if (gate instanceof Response) return gate;

        const id = new URL(req.url).searchParams.get("id");
        if (!id) return redirect(`${this._prefix}/admin?error=${encodeURIComponent("Bucket id manquant.")}`);

        await this._storage.dropBucket(id);
        await this._buckets.delete(id);
        return redirect(`${this._prefix}/admin`);
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
                if (t.quality !== undefined) {
                    pipe = pipe.webp({ quality });
                    mimeType = "image/webp";
                } else {
                    mimeType = "image/webp";
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

    private _qualifyItem(item: MediaItem, req: Request): void {
        if (item.type === "folder") return;
        if (/^https?:\/\//i.test(item.absoluteURL)) return;
        item.absoluteURL = new URL(req.url).origin + item.absoluteURL;
    }

    private async _nameTaken(bucketID: string, name: string, parentFolderID: string | null, excludeId?: string): Promise<boolean> {
        const all = await this._storage.listItems(bucketID);
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
            const node = await this._storage.getItem(bucketID, cursor);
            cursor = node?.parentFolderID ?? null;
        }
        return false;
    }

    private async _deleteSubtree(bucketID: string, folderId: string): Promise<void> {
        const all = await this._storage.listItems(bucketID);
        for (const i of all) {
            if (i.parentFolderID !== folderId) continue;
            if (i.type === "folder") await this._deleteSubtree(bucketID, i.id);
            await this._storage.deleteItem(bucketID, i.id);
        }
    }
}

// ── module-private helpers ──────────────────────────────────────────────

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

function mimeAccepted(accepted: string[] | "*", mime: string): boolean {
    if (accepted === "*") return true;
    for (const pattern of accepted) {
        if (pattern === "*" || pattern === mime) return true;
        if (pattern.endsWith("/*") && mime.startsWith(pattern.slice(0, -1))) return true;
    }
    return false;
}

function constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

// ── admin pages ─────────────────────────────────────────────────────────

/**
 * Minimal inline fallback used when `uiScriptUrl` / `uiStyleUrl` are not
 * configured. Kept tiny because production deployments are expected to
 * provide their own web-component bundle + theme.
 */
const FALLBACK_STYLE = `
    body { font-family: system-ui, sans-serif; color: #1a1a1a; background: #f7f7f9; margin: 0; }
    .shell { max-width: 1040px; margin: 2rem auto; padding: 0 1.25rem; }
    h1 { margin: 0 0 0.25rem; font-size: 1.4rem; }
    .muted { color: #666; font-size: 0.9rem; }
    .card { background: #fff; border: 1px solid #e5e5e5; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; vertical-align: top; }
    button { padding: 0.4rem 0.9rem; cursor: pointer; border: 1px solid #ccc; background: #fff; border-radius: 6px; }
    input[type=text] { padding: 0.4rem; border: 1px solid #ccc; border-radius: 6px; width: 100%; box-sizing: border-box; }
    .warn { background: #fff4e5; border-color: #f5c97f; }
    .err { background: #fee; border-color: #c33; }
    code.secret { display: block; font-family: ui-monospace, monospace; padding: 0.75rem; background: #111; color: #fff; border-radius: 6px; word-break: break-all; font-size: 0.9rem; }
`;

type AdminPageData = {
    subject: Subject<string>;
    buckets: BucketConfig[];
    basePath: string;
    adminLogoutUrl: string;
    newSecret?: string;
    newBucketId?: string;
    error?: string;
    uiScriptUrl?: string;
    uiStyleUrl?: string;
};

function renderAdminPage(data: AdminPageData): string {
    return data.uiScriptUrl && data.uiStyleUrl
        ? renderAdminPageRich(data)
        : renderAdminPageFallback(data);
}

/**
 * Web-component-based admin UI. Uses `<w13c-left-menu-layout>` for the
 * sidebar shell, `<p9r-table>` for the bucket list, and 4 shared
 * `<p9r-form-dialog>` instances (Create / Edit / Rotate / Delete) that a
 * small inline script re-targets per row.
 */
function renderAdminPageRich(data: AdminPageData): string {
    const { subject, buckets, basePath, adminLogoutUrl, newSecret, newBucketId, error, uiScriptUrl, uiStyleUrl } = data;

    const secretCard = newSecret
        ? `<div class="card card--warn">
            <h3>Nouveau secret — bucket <code>${escapeHtml(newBucketId ?? "")}</code></h3>
            <p class="muted">Copie-le maintenant. Il ne sera plus jamais affiché.</p>
            <code class="secret-value">${escapeHtml(newSecret)}</code>
        </div>`
        : "";

    const errorCard = error
        ? `<div class="card card--err"><strong>Erreur</strong> — ${escapeHtml(error)}</div>`
        : "";

    const rowsHtml = buckets.length === 0
        ? `<p9r-row><p9r-cell><span class="muted">Aucun bucket.</span></p9r-cell></p9r-row>`
        : buckets.map((b) => {
            const mimeDisplay = b.acceptedMimeTypes === "*" ? "*" : b.acceptedMimeTypes.join(", ");
            const dataAttrs = [
                `data-bucket-id="${escapeHtml(b.id)}"`,
                `data-bucket-name="${escapeHtml(b.name)}"`,
                `data-bucket-max="${b.maxFileSize}"`,
                `data-bucket-mime="${escapeHtml(mimeDisplay)}"`,
            ].join(" ");
            return `<p9r-row>
                <p9r-cell><strong>${escapeHtml(b.name)}</strong></p9r-cell>
                <p9r-cell><code>${escapeHtml(b.id)}</code></p9r-cell>
                <p9r-cell>${formatBytes(b.maxFileSize)}</p9r-cell>
                <p9r-cell>${escapeHtml(mimeDisplay)}</p9r-cell>
                <p9r-cell>${b.createdAt.toISOString().slice(0, 10)}</p9r-cell>
                <p9r-cell>
                    <div class="row">
                        <p9r-button variant="ghost" data-open-dialog="edit-dialog" ${dataAttrs}>Éditer</p9r-button>
                        <p9r-button variant="ghost" color="warning" data-open-dialog="rotate-dialog" ${dataAttrs}>Rotate</p9r-button>
                        <p9r-button variant="ghost" color="danger" data-open-dialog="delete-dialog" ${dataAttrs}>Supprimer</p9r-button>
                    </div>
                </p9r-cell>
            </p9r-row>`;
        }).join("");

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>MediaHub — admin</title>
<link rel="stylesheet" href="${escapeHtml(uiStyleUrl!)}" />
<script type="module" src="${escapeHtml(uiScriptUrl!)}"></script>
</head>
<body>

<w13c-left-menu-layout>
    <w13c-lateral-menu slot="sidebar">
        <h1 slot="header">MediaHub <span>admin</span></h1>
        <w13c-lateral-menu-item href="${escapeHtml(basePath)}/admin">Buckets</w13c-lateral-menu-item>
    </w13c-lateral-menu>

    <div class="page">
        <header class="page-header">
            <div>
                <h1>Buckets</h1>
                <p class="muted">Connecté en tant que <strong>${escapeHtml(subject.displayName ?? subject.identifier)}</strong>
                    · <a href="${escapeHtml(adminLogoutUrl)}">Se déconnecter</a></p>
            </div>
            <p9r-button variant="filled" color="primary" data-open-dialog="create-dialog">Nouveau bucket</p9r-button>
        </header>

        ${errorCard}
        ${secretCard}

        <p9r-table>
            <p9r-row slot="header">
                <p9r-header-cell>Nom</p9r-header-cell>
                <p9r-header-cell>ID</p9r-header-cell>
                <p9r-header-cell>Max size</p9r-header-cell>
                <p9r-header-cell>MIMEs</p9r-header-cell>
                <p9r-header-cell>Créé</p9r-header-cell>
                <p9r-header-cell>Actions</p9r-header-cell>
            </p9r-row>
            ${rowsHtml}
        </p9r-table>
    </div>
</w13c-left-menu-layout>

<p9r-form-dialog id="create-dialog"
    action="${escapeHtml(basePath)}/admin/buckets"
    method="POST"
    enctype="multipart/form-data">
    <span slot="title">Créer un bucket</span>
    <p9r-input name="name" label="Nom" placeholder="cms-x" required max-count="120"></p9r-input>
</p9r-form-dialog>

<p9r-form-dialog id="edit-dialog"
    data-action-template="${escapeHtml(basePath)}/admin/buckets/update?id={ID}"
    method="POST"
    enctype="multipart/form-data">
    <span slot="title">Éditer le bucket</span>
    <div class="stack">
        <p9r-input name="name" label="Nom" required max-count="120"></p9r-input>
        <p9r-input name="maxFileSize" label="Max file size (bytes)" type="text" hint="Entier positif en octets."></p9r-input>
        <p9r-input name="acceptedMimeTypes" label="MIMEs acceptés" hint='"*" pour tout, ou liste CSV (ex: image/png, image/jpeg).'></p9r-input>
    </div>
</p9r-form-dialog>

<p9r-form-dialog id="rotate-dialog"
    data-action-template="${escapeHtml(basePath)}/admin/buckets/rotate?id={ID}"
    method="POST"
    enctype="multipart/form-data">
    <span slot="title">Rotate le secret</span>
    <p>Un nouveau secret sera généré. <strong>Le précédent cesse de fonctionner immédiatement</strong> — les apps qui l'utilisent doivent être reconfigurées.</p>
</p9r-form-dialog>

<p9r-form-dialog id="delete-dialog"
    data-action-template="${escapeHtml(basePath)}/admin/buckets/delete?id={ID}"
    method="POST"
    enctype="multipart/form-data">
    <span slot="title">Supprimer le bucket</span>
    <p><strong>Irréversible.</strong> Tous les items, fichiers et la config du bucket seront purgés.</p>
</p9r-form-dialog>

<script>
document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-open-dialog]');
    if (!btn) return;
    ev.preventDefault();
    var dialog = document.getElementById(btn.dataset.openDialog);
    if (!dialog) return;

    var bucketId = btn.dataset.bucketId;
    if (bucketId && dialog.dataset.actionTemplate) {
        dialog.setAttribute('action', dialog.dataset.actionTemplate.replace('{ID}', encodeURIComponent(bucketId)));
    }

    var sync = function (name, value) {
        if (value === undefined) return;
        var el = dialog.querySelector('[name="' + name + '"]');
        if (el) el.value = value;
    };
    sync('name',              btn.dataset.bucketName);
    sync('maxFileSize',       btn.dataset.bucketMax);
    sync('acceptedMimeTypes', btn.dataset.bucketMime);

    dialog.showModal();
});
</script>

</body>
</html>`;
}

function renderAdminPageFallback(data: AdminPageData): string {
    const { subject, buckets, basePath, adminLogoutUrl, newSecret, newBucketId, error } = data;

    const secretCard = newSecret
        ? `<div class="card warn"><h3>Nouveau secret — bucket <code>${escapeHtml(newBucketId ?? "")}</code></h3><p class="muted">Copie-le maintenant.</p><code class="secret">${escapeHtml(newSecret)}</code></div>`
        : "";
    const errorCard = error
        ? `<div class="card err"><strong>Erreur</strong> — ${escapeHtml(error)}</div>`
        : "";
    const rows = buckets.length === 0
        ? `<tr><td colspan="5" class="muted">Aucun bucket.</td></tr>`
        : buckets.map((b) => {
            const mimeDisplay = b.acceptedMimeTypes === "*" ? "*" : b.acceptedMimeTypes.join(", ");
            return `<tr>
                <td><strong>${escapeHtml(b.name)}</strong></td>
                <td><code>${escapeHtml(b.id)}</code></td>
                <td>${b.maxFileSize.toLocaleString()} o<br /><small>${escapeHtml(mimeDisplay)}</small></td>
                <td>${b.createdAt.toISOString().slice(0, 10)}</td>
                <td>
                    <form method="post" action="${escapeHtml(basePath)}/admin/buckets/rotate?id=${encodeURIComponent(b.id)}" style="display:inline"><button type="submit">Rotate</button></form>
                    <form method="post" action="${escapeHtml(basePath)}/admin/buckets/delete?id=${encodeURIComponent(b.id)}" style="display:inline" onsubmit="return confirm('Supprimer ce bucket ?')"><button type="submit">Supprimer</button></form>
                </td>
            </tr>`;
        }).join("");

    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><title>MediaHub — admin</title><style>${FALLBACK_STYLE}</style></head>
<body><div class="shell">
<h1>Buckets</h1>
<p class="muted">Connecté en tant que <strong>${escapeHtml(subject.displayName ?? subject.identifier)}</strong> · <a href="${escapeHtml(adminLogoutUrl)}">Se déconnecter</a></p>
${errorCard}
${secretCard}
<table><thead><tr><th>Nom</th><th>ID</th><th>Limites</th><th>Créé</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
<div class="card"><h2>Créer un bucket</h2>
<form method="post" action="${escapeHtml(basePath)}/admin/buckets" enctype="multipart/form-data">
    <p><input type="text" name="name" required maxlength="120" placeholder="cms-app-a" /></p>
    <button type="submit">Créer</button>
</form></div>
</div></body></html>`;
}

function renderAdminErrorPage(message: string): string {
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><title>Accès refusé</title><style>${FALLBACK_STYLE}</style></head>
<body><div class="shell"><div class="card err"><h1>Accès refusé</h1><p>${escapeHtml(message)}</p></div></div></body></html>`;
}

function formatBytes(n: number): string {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MiB";
    if (n >= 1024)        return (n / 1024).toFixed(1) + " KiB";
    return n + " o";
}
