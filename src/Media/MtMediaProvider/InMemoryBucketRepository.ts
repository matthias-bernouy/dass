import type { BucketConfig, BucketRepository } from "./Bucket";

/**
 * Default in-process `BucketRepository`. State is lost on restart; suitable
 * for dev, tests and ephemeral environments only.
 */
export class InMemoryBucketRepository implements BucketRepository {

    private _buckets = new Map<string, BucketConfig>();

    async getById(id: string): Promise<BucketConfig | null> {
        return this._buckets.get(id) ?? null;
    }

    async list(): Promise<BucketConfig[]> {
        return [...this._buckets.values()]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async create(cfg: Omit<BucketConfig, "id" | "createdAt" | "updatedAt">): Promise<BucketConfig> {
        const now = new Date();
        const bucket: BucketConfig = {
            ...cfg,
            id:        crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        this._buckets.set(bucket.id, bucket);
        return bucket;
    }

    async update(id: string, patch: Partial<Omit<BucketConfig, "id" | "createdAt">>): Promise<BucketConfig | null> {
        const existing = this._buckets.get(id);
        if (!existing) return null;
        const updated: BucketConfig = { ...existing, ...patch, updatedAt: new Date() };
        this._buckets.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        return this._buckets.delete(id);
    }
}
