import type { MediaItem } from "../Media";
import type { MediaStorage } from "./MediaStorage";

/**
 * Default `MediaStorage` impl: two `Map`s, zero persistence. Everything is
 * lost on restart. Suitable for dev, tests and ephemeral environments.
 */
export class InMemoryMediaStorage implements MediaStorage {

    private _items = new Map<string, MediaItem>();
    private _bytes = new Map<string, Uint8Array>();

    async getItem(id: string): Promise<MediaItem | null> {
        return this._items.get(id) ?? null;
    }

    async putItem(item: MediaItem): Promise<void> {
        this._items.set(item.id, item);
    }

    async deleteItem(id: string): Promise<void> {
        this._items.delete(id);
        this._bytes.delete(id);
    }

    async listItems(): Promise<MediaItem[]> {
        return [...this._items.values()];
    }

    async getBytes(id: string): Promise<Uint8Array | null> {
        return this._bytes.get(id) ?? null;
    }

    async putBytes(id: string, bytes: Uint8Array): Promise<void> {
        this._bytes.set(id, bytes);
    }
}
