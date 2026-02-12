import { FFIType } from "bun:ffi";
export declare const symbols: import("bun:ffi").ConvertFns<{
    create_tx: {
        args: never[];
        returns: FFIType.uint64_t;
    };
    commit_tx: {
        args: FFIType.uint64_t[];
        returns: FFIType.uint32_t;
    };
    abort_tx: {
        args: FFIType.uint64_t[];
        returns: FFIType.uint32_t;
    };
}>;
export default symbols;
