/**
 * Per-bucket configuration held by the `MtMediaProvider`. Each consumer app
 * is bound to one bucket via the shared `secret`: the consumer presents it
 * when asking the provider to mint short-lived, one-time mutation tokens.
 *
 * The raw secret is NEVER stored — only its SHA-256 hash (`secretHash`). The
 * raw value is shown once at creation / rotation time and then forgotten.
 */
export type BucketConfig = {
    /** Opaque bucket identifier, generated on creation. */
    id: string;
    /** Human-friendly label shown in the admin UI. */
    name: string;
    /** Hex SHA-256 of the shared secret. */
    secretHash: string;
    /** Upload cap enforced on this bucket. */
    maxFileSize: number;
    /** Allow-list for uploads. See `Media.limits.acceptedMimeTypes`. */
    acceptedMimeTypes: string[] | "*";
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Pluggable storage for bucket configurations. Implementations are free to
 * back it with any persistence layer. Keep it cheap — it runs on every
 * request since the provider looks up the bucket to route.
 */
export interface BucketRepository {
    getById(id: string): Promise<BucketConfig | null>;
    list(): Promise<BucketConfig[]>;
    create(cfg: Omit<BucketConfig, "id" | "createdAt" | "updatedAt">): Promise<BucketConfig>;
    update(id: string, patch: Partial<Omit<BucketConfig, "id" | "createdAt">>): Promise<BucketConfig | null>;
    delete(id: string): Promise<boolean>;
}
