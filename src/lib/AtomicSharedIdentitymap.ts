import { dlopen, FFIType, ptr } from "bun:ffi";

const path = "./build/libAtomicSharedIdentityMap.so";

const { symbols } = dlopen(path, {
    link: {
        args: [FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.bool,
    },
    exists: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.bool,
    },
    get: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.u64,
    },
    unlink: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.bool,
    },
    count: {
        args: [],
        returns: FFIType.u32,
    }
});

export class AtomicSharedIdentitymap {
    private readonly prefix: Uint8Array;
    private readonly keyWorkBuffer = new Uint8Array(512); // 512 bytes should be enough for most keys
    static readonly NOT_FOUND = 18446744073709551615n;

    constructor(namespace: string) {
        this.prefix = Buffer.from(namespace + ":");
        this.keyWorkBuffer.set(this.prefix, 0);
    }

    private prepareKey(key: string | Uint8Array): [any, number] {
        if (typeof key === "string") {
            const written = Buffer.from(this.keyWorkBuffer.buffer, this.keyWorkBuffer.byteOffset + this.prefix.length).write(key);
            const totalLen = this.prefix.length + written;
            return [ptr(this.keyWorkBuffer), totalLen];
        } else {
            this.keyWorkBuffer.set(key, this.prefix.length);
            return [ptr(this.keyWorkBuffer), this.prefix.length + key.length];
        }
    }

    link(key: string | Uint8Array, value: bigint | number): void {
        const [kPtr, kLen] = this.prepareKey(key);
        // On passe directement la valeur. Bun convertit le BigInt en uint64_t pour le C.
        const res = symbols.link(kPtr, kLen, BigInt(value));
        if (!res) {
            throw new Error("[AtomicSharedIdentitymap] critical error: Identity map is full");
        }
    }

    exists(key: string | Uint8Array): boolean {
        const [kPtr, kLen] = this.prepareKey(key);
        return symbols.exists(kPtr, kLen);
    }

    get(key: string | Uint8Array): bigint | null {
        const [kPtr, kLen] = this.prepareKey(key);
        const vPtr = symbols.get(kPtr, kLen);
        if (vPtr === AtomicSharedIdentitymap.NOT_FOUND) {
            return null;
        }
        return vPtr;
    }

    unlink(key: string | Uint8Array): void {
        const [kPtr, kLen] = this.prepareKey(key);
        symbols.unlink(kPtr, kLen);
    }

    count(): number {
        return symbols.count();
    }

}