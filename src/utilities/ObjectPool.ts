


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

export const bufferPool256bytes  = new ObjectPool(() => Buffer.alloc(256));
export const bufferPool1024bytes = new ObjectPool(() => Buffer.alloc(1024));