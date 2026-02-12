export declare class ObjectPool<T> {
    private pool;
    private createFn;
    constructor(createFn: () => T);
    acquire(): T;
    release(obj: T): void;
}
export declare const bufferPool64bytes: ObjectPool<Buffer<ArrayBuffer>>;
export declare const bufferPool128bytes: ObjectPool<Buffer<ArrayBuffer>>;
export declare const bufferPool256bytes: ObjectPool<Buffer<ArrayBuffer>>;
export declare const bufferPool1024bytes: ObjectPool<Buffer<ArrayBuffer>>;
export declare const bufferPool4096bytes: ObjectPool<Buffer<ArrayBuffer>>;
export declare const bufferPool65536bytes: ObjectPool<Buffer<ArrayBuffer>>;
export declare const bufferPool2Mb: ObjectPool<Buffer<ArrayBuffer>>;
