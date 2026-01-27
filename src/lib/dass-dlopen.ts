import { dlopen, FFIType, ptr } from "bun:ffi";

const path = "./build/libnative.so";

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
    }

    // Transaction management
    // create_transaction: {
    //     args: [],
    //     returns: FFIType.u64,
    // },

    // commit_transaction: {
    //     args: [FFIType.u64],
    //     returns: FFIType.u32,
    // },

    // abort_transaction: {
    //     args: [FFIType.u64],
    //     returns: FFIType.u64,
    // }

});

