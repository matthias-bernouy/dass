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
} from "../../../../interfaces/Media";
import type { Authentication, Subject } from "../../../../interfaces/Authentication/Authentication";
import type { BucketConfig, BucketRepository } from "./Bucket";
import type { BucketMediaStorage } from "./BucketMediaStorage";

/**
 * Handler-facing surface of `MtMediaProvider`. Everything a route handler in
 * `api/*.ts` needs to do its job lives on this interface — state accessors,
 * business operations, and cross-cutting helpers (auth gate, CORS, token
 * lifecycle).
 *
 * Role-agnostic on purpose: handlers treat the caller's role as an opaque
 * `string` since their behavior never branches on a concrete role value.
 * The provider class keeps its Role generic for consumers that care, and
 * satisfies this interface via structural compatibility (`Role extends
 * string` → `Authentication<Role>` is assignable to `Authentication<string>`).
 */
export interface ProviderContext {

    // ── State (read-only views) ──────────────────────────────────────────
    readonly admin: Authentication<string>;
    readonly adminRole: string;
    readonly buckets: BucketRepository;
    readonly storage: BucketMediaStorage;
    /** URL prefix where the provider was mounted (e.g. `/mediahub`, or `""`). */
    readonly prefix: string;
    readonly defaultMaxFileSize: number;
    readonly defaultAcceptedMimeTypes: string[] | "*";
    readonly tokenTtlMs: number;
    readonly corsAllowedOrigins: string[] | "*";

    // ── Business operations ──────────────────────────────────────────────
    getItems(bucketID: string, opts?: MediaGetItemsOptions): Promise<MediaResponse<MediaItemsPage>>;
    getItem(bucketID: string, id: string): Promise<MediaResponse<MediaItem>>;
    uploadFile(bucket: BucketConfig, opts: MediaUploadFileOptions): Promise<MediaResponse<FileMetadata>>;
    createFolder(bucketID: string, opts: MediaCreateFolderOptions): Promise<MediaResponse<FolderMetadata>>;
    updateItem(bucketID: string, opts: MediaUpdateItemOptions): Promise<MediaResponse<MediaItem>>;
    deleteItem(bucketID: string, opts: MediaDeleteItemOptions): Promise<MediaResponse<{ id: string }>>;

    /** Serves the raw file bytes for `GET /file`, including image transforms. */
    serveFileBytes(bucketID: string, id: string, url: URL): Promise<Response>;

    // ── Token lifecycle ──────────────────────────────────────────────────
    rememberToken(token: string, bucketID: string, expiresAt: number): void;
    /** Returns the owning bucket on hit (and consumes the token), `null` otherwise. */
    consumeToken(raw: string): { bucketID: string } | null;
    /**
     * Reads `Authorization: MtMedia <token>` from `req`, consumes it, and
     * checks that it was minted for `bucketID`. Returns `null` on success or
     * a typed error otherwise.
     */
    requireToken(req: Request, bucketID: string): MediaResponse<never> | null;

    // ── Admin gate ───────────────────────────────────────────────────────
    /**
     * Resolves the admin `Subject`, or returns a pre-built `Response`
     * (redirect to login / 403 page) that handlers forward as-is.
     */
    requireAdmin(req: Request): Promise<Subject<string> | Response>;

    // ── CORS ─────────────────────────────────────────────────────────────
    resolveAllowedOrigin(origin: string | null): string | null;
}
