import { Field } from "./Field";
export declare class StringField extends Field {
    constructor(fieldName: string);
    getType(): string;
    code_generator_ts_http_pre_call_POST(): string;
    code_generator_ts_http_call_params_POST(): string;
    code_generator_ts_http_post_call_POST(): string;
    code_generator_ts_http_pre_call_PATCH(): string;
    code_generator_ts_http_call_params_PATCH(): string;
    code_generator_ts_http_post_call_PATCH(): string;
    code_generator_ts_create(): string;
    code_generator_ts_update(): string;
    code_generator_c_struct(): string;
    code_generator_c_get_as_json(): string;
    code_generator_c_create_param(): string;
    code_generator_c_create_raw_size(): string;
    code_generator_c_create_object(): string;
    code_generator_c_create_raw_data(): string;
    code_generator_c_update_params(): string;
    code_generator_c_update_raw_size(): string;
    code_generator_c_update_object(): string;
    code_generator_c_update_raw_data(): string;
}
