import { dlopen, FFIType, ptr } from "bun:ffi";

const path = "{{PATH_C}}";

export const { symbols } = dlopen(path, {

//{{METHODS}}

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

})

export default symbols;