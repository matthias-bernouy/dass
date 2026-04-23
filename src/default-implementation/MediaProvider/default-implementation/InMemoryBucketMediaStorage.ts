import type { MediaItem } from "../../../interfaces/Media";
import type { BucketMediaStorage } from "../src/interfaces/BucketMediaStorage";

/**
 * Default `BucketMediaStorage` impl: two `Map`s keyed by `${bucketID}:${id}`,
 * zero persistence. Everything is lost on restart.
 */
export class InMemoryBucketMediaStorage implements BucketMediaStorage {

    private _items = new Map<string, MediaItem>();
    private _bytes = new Map<string, Uint8Array>();

    async getItem(bucketID: string, id: string): Promise<MediaItem | null> {
        return this._items.get(k(bucketID, id)) ?? null;
    }

    async putItem(bucketID: string, item: MediaItem): Promise<void> {
        this._items.set(k(bucketID, item.id), item);
    }

    async deleteItem(bucketID: string, id: string): Promise<void> {
        this._items.delete(k(bucketID, id));
        this._bytes.delete(k(bucketID, id));
    }

    async listItems(bucketID: string): Promise<MediaItem[]> {
        const prefix = `${bucketID}:`;
        const out: MediaItem[] = [];
        for (const [key, item] of this._items) {
            if (key.startsWith(prefix)) out.push(item);
        }
        return out;
    }

    async getBytes(bucketID: string, id: string): Promise<Uint8Array | null> {
        return this._bytes.get(k(bucketID, id)) ?? null;
    }

    async putBytes(bucketID: string, id: string, bytes: Uint8Array): Promise<void> {
        this._bytes.set(k(bucketID, id), bytes);
    }

    async dropBucket(bucketID: string): Promise<void> {
        const prefix = `${bucketID}:`;
        for (const key of [...this._items.keys()]) {
            if (key.startsWith(prefix)) this._items.delete(key);
        }
        for (const key of [...this._bytes.keys()]) {
            if (key.startsWith(prefix)) this._bytes.delete(key);
        }
    }
}

function k(bucketID: string, id: string): string {
    return `${bucketID}:${id}`;
}
