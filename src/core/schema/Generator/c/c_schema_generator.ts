import type { Schema } from "../../Schema";
import { mapAndJoin } from "../mapAndJoin";
import TEMPLATE_C from "src/.dass-generated/c/C_DOCUMENT_TEMPLATE.c?raw";


export function c_schema_generator(schema: Schema){

    let params, raw_size, create_object, create_raw_data, update_object, update_raw_data;
    let template = TEMPLATE_C;

    // Process base
    let struct = mapAndJoin(schema.getFields(), "\n", f => f.code_generator_c_struct());
    template = template
        .replaceAll("Template", schema.getName())
        .replaceAll("Template*", `${schema.getName()}*`)
        .replaceAll("template", `${schema.getName().toLowerCase()}`)
        .replace("static const uint16_t DEF_ZONE_ID = 0;//Generated", `static const uint16_t DEF_ZONE_ID = ${schema.getOptions().defaultZone};`)
        .replace("static const uint16_t SCHEMA_ID   = 0;//Generated", `static const uint16_t SCHEMA_ID   = ${schema.getSchemaID()};`)
        .replace("{{STRUCTS}}", struct);


    // Process create
    params          = mapAndJoin(schema.getFields(), ", ", f => f.code_generator_c_create_param());
    raw_size        = mapAndJoin(schema.getFields(), " + ", f => f.code_generator_c_create_raw_size());
    create_object   = mapAndJoin(schema.getFields(), "\n", f => f.code_generator_c_create_object());
    create_raw_data = mapAndJoin(schema.getFields(), "\n", f => f.code_generator_c_create_raw_data());
    template = template
        .replace("{{CREATE_PARAMS}}", params + (params ? ", " : ""))
        .replace("const uint64_t create_raw_size = 0;//Generated", `const uint64_t create_raw_size = ${raw_size};`)
        .replace("{{CREATE_OBJECT}}", create_object)
        .replace("{{CREATE_RAW_DATA}}", create_raw_data);


    // Process update
    params          = mapAndJoin(schema.getFields(), ", ", f => f.code_generator_c_update_params());
    raw_size        = mapAndJoin(schema.getFields(), " + ", f => f.code_generator_c_update_raw_size());
    update_object   = mapAndJoin(schema.getFields(), "\n", f => f.code_generator_c_update_object());
    update_raw_data = mapAndJoin(schema.getFields(), "\n", f => f.code_generator_c_update_raw_data());
    template = template
        .replace("{{UPDATE_PARAMS}}", params + (params ? ", " : ""))
        .replace("const uint64_t update_raw_size = 0;//Generated", `const uint64_t update_raw_size = ${raw_size};`)
        .replace("{{UPDATE_OBJECT}}", update_object)
        .replace("{{UPDATE_RAW_DATA}}", update_raw_data);


    // Process get as json
    let get_as_json = mapAndJoin(schema.getFields(), '\nmemcpy(json_output + json_cpt++, ",", 1);', f => f.code_generator_c_get_as_json());
    template = template.replace("//{{GET_AS_JSON}}", get_as_json);
        
    return template;
}