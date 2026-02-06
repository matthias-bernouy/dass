import { dlopen, FFIType, ptr } from "bun:ffi";
import { join } from "path";
import { bufferPool256bytes } from "src/utilities/ObjectPool";

const path = join(__dirname, "build/generated.so");

export const { symbols } = dlopen(path, {

    // User* create_user(uint8_t* email, uint32_t email_length, uint8_t* fullname, uint32_t fullname_length, uint64_t tx_id)
    create_user: {
        args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u32, FFIType.u64],
        returns: FFIType.ptr
    },

    get_document: {
        args: [FFIType.ptr],
        returns: FFIType.ptr
    },

    // Transaction management
    create_tx: {
        args: [],
        returns: FFIType.u64,
    },

    commit_tx: {
        args: [FFIType.u64],
        returns: FFIType.u32,
    },

    abort_tx: {
        args: [FFIType.u64],
        returns: FFIType.u32,
    }

});

export const SECRET_MASK = 0xA23D9AA16E71C85An;

export const idToBuffer = (idStr: string): Buffer<ArrayBuffer> => {
    const buffer = bufferPool256bytes.acquire();
    
    const salt = BigInt("0x" + idStr.substring(0, 16));
    const hidden = BigInt("0x" + idStr.substring(16, 32));
    const others = hidden ^ SECRET_MASK;

    buffer.writeBigUInt64LE(salt, 0);
    const zone = Number(others & 0xFFFFn);
    const shard = Number((others >> 16n) & 0xFFFFFFFFn);
    const id = Number((others >> 48n) & 0xFFFFn);

    buffer.writeUInt16LE(zone, 8);
    buffer.writeUInt32LE(shard, 10);
    buffer.writeUInt16LE(id, 14);

    return buffer;
}


export const create_user_native = symbols.create_user;

export const create_tx_native = symbols.create_tx;
export const commit_tx_native = symbols.commit_tx;
export const abort_tx_native = symbols.abort_tx;
export const get_document_native = symbols.get_document;