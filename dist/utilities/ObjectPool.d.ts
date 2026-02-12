export declare class ObjectPool<T> {
    private pool;
    private createFn;
    constructor(createFn: () => T);
    acquire(): T;
    release(obj: T): void;
}
export declare const bufferPool256bytes: ObjectPool<Buffer<ArrayBuffer>>;
export declare const bufferPool1024bytes: ObjectPool<Buffer<ArrayBuffer>>;
