import { dlopen, FFIType, ptr } from "bun:ffi";

const path = "./build/libnative.so";

export const { symbols } = dlopen(path, {

    // Identity map management
    link_key_identity_map: {
        args: [FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.u64],
        returns: FFIType.u32,
    },

    unlink_key_identity_map: {
        args: [FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.u32,
    },

    key_exists_identity_map: {
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

