import type { MediaItem } from "../../../../../interfaces/Media";

/**
 * Bucket-scoped blob + metadata store used by `MtMediaProvider`. Semantically
 * identical to `MediaStorage` in the single-tenant provider, but every method
 * takes an explicit `bucketID` so implementations can partition a single
 * backend across many tenants. Business logic still lives in the provider.
 */
export interface BucketMediaStorage {

    /** Retrieve a stored item by id within `bucketID`. Returns `null` if absent. */
    getItem(bucketID: string, id: string): Promise<MediaItem | null>;

    /** Insert or overwrite a stored item (metadata only; see `putBytes`). */
    putItem(bucketID: string, item: MediaItem): Promise<void>;

    /**
     * Remove an item and, if it was a file, its associated bytes. No-op if
     * the `(bucketID, id)` pair is unknown.
     */
    deleteItem(bucketID: string, id: string): Promise<void>;

    /** Enumerate all stored items in `bucketID`. */
    listItems(bucketID: string): Promise<MediaItem[]>;

    /** Retrieve raw bytes for a file. Returns `null` if no bytes are stored. */
    getBytes(bucketID: string, id: string): Promise<Uint8Array | null>;

    /** Store raw bytes for a file. The caller guarantees the item exists. */
    putBytes(bucketID: string, id: string, bytes: Uint8Array): Promise<void>;

    /**
     * Wipe every item and byte blob associated with `bucketID`. Called when
     * an admin deletes the bucket. No-op on unknown buckets.
     */
    dropBucket(bucketID: string): Promise<void>;
}
