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
    },

    // Document management
    init_schema_shards_counters: {
        args: [],
        returns: FFIType.u32,
    },

    test: {
        args: [],
        returns: FFIType.void,
    },

    benchmark_batch_c:{
        args: [FFIType.u32],
        returns: FFIType.void,
    }

});

export const link_idmap_native = symbols.link_idmap;
export const unlink_idmap_native = symbols.unlink_idmap;
export const exists_idmap_native = symbols.exists_idmap;

export const create_tx_native = symbols.create_tx;
export const commit_tx_native = symbols.commit_tx;
export const abort_tx_native = symbols.abort_tx;

export const init_schema_shards_counters_native = symbols.init_schema_shards_counters;
export const test_native = symbols.test;
export const benchmark_batch_native = symbols.benchmark_batch_c;