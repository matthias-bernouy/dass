import type { Schema } from "../Schema";
import { mapAndJoin } from "./mapAndJoin";
    
export function tsLib_generator(schema: Schema){

    let args: string;
    let methods = "";

    // Create method
    args = mapAndJoin(schema.getFields(), ", ", f => f.code_generator_ts_create());
    methods += `
    create_${schema.getName().toLowerCase()}: {
        args: [${args}, FFIType.u64],
        returns: FFIType.u64,
    },
    `


    // Update method
    args = mapAndJoin(schema.getFields(), ", ", f => f.code_generator_ts_update());
    methods += `
    update_${schema.getName().toLowerCase()}: {
        args: [${args}, FFIType.u64],
        returns: FFIType.u64,
    },
    `

    // Delete method
    methods += `
    delete_${schema.getName().toLowerCase()}: {
        args: [FFIType.u64, FFIType.u64],
        returns: FFIType.u32,
    },
    `

    // Get method
    methods += `
    get_${schema.getName().toLowerCase()}: {
        args: [FFIType.u64],
        returns: FFIType.ptr,
    },
    `
    
    return methods;
}