import type { Schema } from "../../../Schema";

export function http_patch_generator(schema: Schema, str: string){

    let BEFORE_CALL_PATCH_GENERATION = schema.getFields().map(f => f.code_generator_ts_http_pre_call_PATCH()).join("\n\t");
    str = str.replace("//BEFORE_CALL_PATCH_GENERATION", BEFORE_CALL_PATCH_GENERATION);

    let CALL_PATCH_GENERATION_PARAMS = schema.getFields().map(f => f.code_generator_ts_http_call_params_PATCH()).join(",");
    str = str.replace("/*CALL_PATCH_GENERATION_PARAMS*/", CALL_PATCH_GENERATION_PARAMS + ",");

    let AFTER_CALL_PATCH_GENERATION = schema.getFields().map(f => f.code_generator_ts_http_post_call_PATCH()).join("\n\t");
    str = str.replaceAll("//AFTER_CALL_PATCH_GENERATION", AFTER_CALL_PATCH_GENERATION);

    return str;
}