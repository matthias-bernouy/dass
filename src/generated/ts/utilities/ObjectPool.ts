export class ObjectPool<T> {

    private pool: T[] = [];
    private createFn: () => T;

    constructor(createFn: () => T) {
        this.createFn = createFn;
    }

    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        } else {
            return this.createFn();
        }
    }

    release(obj: T): void {
        this.pool.push(obj);
    }
}

export const bufferPool64bytes    = new ObjectPool(() => Buffer.alloc(64));
export const bufferPool128bytes   = new ObjectPool(() => Buffer.alloc(128));
export const bufferPool256bytes   = new ObjectPool(() => Buffer.alloc(256));
export const bufferPool1024bytes  = new ObjectPool(() => Buffer.alloc(1024));
export const bufferPool4096bytes  = new ObjectPool(() => Buffer.alloc(4096));
export const bufferPool65536bytes = new ObjectPool(() => Buffer.alloc(65536)); // 64KB
export const bufferPool2Mb        = new ObjectPool(() => Buffer.alloc(2 * 1024 * 1024)); // 2MB