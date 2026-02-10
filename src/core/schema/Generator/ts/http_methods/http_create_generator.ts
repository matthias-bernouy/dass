import type { Schema } from "../../../Schema";

export function http_create_generator(schema: Schema, str: string){

    let BEFORE_CALL_POST_GENERATION = schema.getFields().map(f => f.code_generator_ts_http_pre_call_POST()).join("\n\t");
    str = str.replace("//BEFORE_CALL_POST_GENERATION", BEFORE_CALL_POST_GENERATION);

    let CALL_POST_GENERATION_PARAMS = schema.getFields().map(f => f.code_generator_ts_http_call_params_POST()).join(",");
    str = str.replace("/*CALL_POST_GENERATION_PARAMS*/", CALL_POST_GENERATION_PARAMS + ",");

    let AFTER_CALL_POST_GENERATION = schema.getFields().map(f => f.code_generator_ts_http_post_call_POST()).join("\n\t");
    str = str.replaceAll("//AFTER_CALL_POST_GENERATION", AFTER_CALL_POST_GENERATION);

    return str;

}