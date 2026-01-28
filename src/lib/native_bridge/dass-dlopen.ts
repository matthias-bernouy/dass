import { dlopen, FFIType, ptr } from "bun:ffi";
import { join } from "path";

const path = join(__dirname, "build/generated.so");

export const { symbols } = dlopen(path, {

    // Identity map management
    link_idmap: {
        args: [FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.u64],
        returns: FFIType.u32,
    },

    unlink_idmap: {
        args: [FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.u32,
    },

    exists_idmap: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.u32,
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

