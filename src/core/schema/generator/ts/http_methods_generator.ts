import type { Schema } from "../../Schema";
import TEMPLATE from "src/.dass-generated/ts/routes/base.raw?raw" with { type: "text" };
import { http_create_generator } from "./http_methods/http_create_generator";
import { http_patch_generator } from "./http_methods/http_patch_generator";

export function http_methods_generator(schema: Schema){

    let ret = TEMPLATE;

    ret = ret.replaceAll("template", schema.getName().toLowerCase());

    ret = http_create_generator(schema, ret);
    ret = http_patch_generator(schema, ret);

    return ret;
}