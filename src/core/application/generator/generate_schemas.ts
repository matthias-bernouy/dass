import { smartFileWriter } from "src/utilities/smartFileWriter";
import { Application } from "../Application";
import { join } from "path";

export async function generate_schemas(application: Application){

    const promises = [];
    const schemas = await application.scan_schemas();
    
    let ffi_methods = "";

    for (const schema of schemas) {
        promises.push(schema.generate_c());
        ffi_methods += schema.generate_ts_ffi_methods();
    }

    promises.push(
        smartFileWriter(
            join(Application.code_generated_dir, "ts", "ffi_methods.raw.ts"),
            ffi_methods
        )
    )
    
    await Promise.all(promises);
    return;
}