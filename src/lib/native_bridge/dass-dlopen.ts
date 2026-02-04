import { dlopen, FFIType, ptr } from "bun:ffi";
import { join } from "path";

const path = join(__dirname, "build/generated.so");

export const { symbols } = dlopen(path, {

    // Identity map management
    link_map: {
        args: [FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.u32,
    },

    unlink_map: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.u32,
    },

    exists_map: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.u32,
    },

    get_map: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.u64,
    },

    create_map: {
        args: [],
        returns: FFIType.ptr,
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
    }

});

export const link_map_native = symbols.link_map;
export const unlink_map_native = symbols.unlink_map;
export const exists_map_native = symbols.exists_map;
export const get_map_native = symbols.get_map;

export const create_map_native = symbols.create_map;

export const create_tx_native = symbols.create_tx;
export const commit_tx_native = symbols.commit_tx;
export const abort_tx_native = symbols.abort_tx;

export const init_schema_shards_counters_native = symbols.init_schema_shards_counters;