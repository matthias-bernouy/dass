import type { MediaItem } from "../Media";

/**
 * Pluggable blob + metadata store used by `StMediaProvider`. Implementations
 * only need to persist items and raw bytes — all business logic (validation,
 * conflicts, recursion, URL construction, image transforms) stays in the
 * provider so the storage stays dumb and interchangeable.
 *
 * Swap the impl to back the provider with a different store (Mongo + GridFS,
 * S3, filesystem, Redis, …) without touching `StMediaProvider`.
 *
 * All methods are async so non-local backends fit without signature churn.
 * Implementations are expected to be transactional per-call only; the
 * provider does not rely on multi-call atomicity.
 */
export interface MediaStorage {

    /** Retrieve a stored item by id. Returns `null` if absent. */
    getItem(id: string): Promise<MediaItem | null>;

    /** Insert or overwrite a stored item (metadata only; see `putBytes`). */
    putItem(item: MediaItem): Promise<void>;

    /**
     * Remove an item and, if it was a file, its associated bytes. No-op if
     * the id is unknown.
     */
    deleteItem(id: string): Promise<void>;

    /**
     * Enumerate all stored items. The provider filters, sorts and paginates
     * in memory — keep this method cheap enough to call per request for
     * small/medium stores.
     */
    listItems(): Promise<MediaItem[]>;

    /** Retrieve raw bytes for a file. Returns `null` if no bytes are stored. */
    getBytes(id: string): Promise<Uint8Array | null>;

    /** Store raw bytes for a file. The caller guarantees the item exists. */
    putBytes(id: string, bytes: Uint8Array): Promise<void>;
}
