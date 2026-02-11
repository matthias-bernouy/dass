import type { Schema } from "../../Schema";
import { mapAndJoin } from "../../../../utilities/mapAndJoin";
    
export function ts_ffi_methods_generator(schema: Schema){

    let args: string;
    let methods = "";

    // Create method
    args = mapAndJoin(schema.getFields(), ", ", f => f.code_generator_ts_create());
    methods += `
    create_${schema.getName().toLowerCase()}: {
        args: [${args}, FFIType.u64],
        returns: FFIType.ptr,
    },
    `

    // Update method
    args = mapAndJoin(schema.getFields(), ", ", f => f.code_generator_ts_update());
    methods += `
    update_${schema.getName().toLowerCase()}: {
        args: [${args}, FFIType.ptr, FFIType.u64],
        returns: FFIType.u32,
    },
    `

    // Delete method
    methods += `
    delete_${schema.getName().toLowerCase()}: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.u32,
    },
    `

    // Get method
    methods += `
    get_${schema.getName().toLowerCase()}: {
        args: [FFIType.ptr],
        returns: FFIType.ptr,
    },
    `

    // Get as json method
    methods += `
    get_${schema.getName().toLowerCase()}_as_json: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.u32,
    },
    `
    
    return methods;
}