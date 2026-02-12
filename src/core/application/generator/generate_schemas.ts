import { smartFileWriter } from "src/utilities/smartFileWriter";
import { c_build_path, ffi_methods_path_generated } from "../ApplicationPaths";
import { get_ffi_methods_template } from "../templates";
import { ApplicationObjects } from "../ApplicationObjects";

export async function generate_schemas(){

    const promises = [];
    const schemas = ApplicationObjects.getSchemas()
    
    let ffi_methods_template = get_ffi_methods_template();
    let ffi_methods = "";

    for (const schema of schemas) {
        promises.push(schema.generate_c());
        ffi_methods += schema.generate_ts_ffi_methods();
    }

    ffi_methods_template = ffi_methods_template
        .replace("//{{FFI_METHODS}}", ffi_methods)
        .replace("{{PATH_C}}", c_build_path())

    promises.push(
        smartFileWriter(
            ffi_methods_path_generated(),
            ffi_methods_template
        )
    )
    
    await Promise.all(promises);
    return;
}