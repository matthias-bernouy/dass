import { library_dir } from "src/utilities/Global";
import { Application } from "./Application";
import { join } from "path";

export function get_dass_generated_dir_source(): string {
    return join(library_dir, "src", "resources", "generated");
}

export function c_build_path(): string {
    return code_generated_dir() + "/c_compiled/libdass.so";
}

export function server_path_generated(): string {
    return code_generated_dir() + "/ts/server.raw.ts";
}

export function ffi_methods_path_generated(): string {
    return code_generated_dir() + "/ts/ffi_methods.raw.ts";
}

export function code_generated_dir(): string {
    return join(Application.cwd, "node_modules", "dass-generated");
}

export function types_generated_dir(): string {
    return join(Application.cwd, "node_modules", "@types", "dass-generated");
}