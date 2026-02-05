import { dlopen, FFIType, ptr } from "bun:ffi";
import { join } from "path";

const path = join(__dirname, "build/generated.so");

export const { symbols } = dlopen(path, {

    // User* create_user(uint8_t* email, uint32_t email_length, uint8_t* fullname, uint32_t fullname_length, uint64_t tx_id)
    create_user: {
        args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u32, FFIType.u64],
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

export const create_user_native = symbols.create_user;

export const create_tx_native = symbols.create_tx;
export const commit_tx_native = symbols.commit_tx;
export const abort_tx_native = symbols.abort_tx;