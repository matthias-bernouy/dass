export declare abstract class Field {
    protected fieldName: string;
    constructor(fieldName: string);
    getName(): string;
    abstract code_generator_ts_http_pre_call_POST(): string;
    abstract code_generator_ts_http_call_params_POST(): string;
    abstract code_generator_ts_http_post_call_POST(): string;
    abstract code_generator_ts_http_pre_call_PATCH(): string;
    abstract code_generator_ts_http_call_params_PATCH(): string;
    abstract code_generator_ts_http_post_call_PATCH(): string;
    abstract code_generator_c_get_as_json(): string;
    abstract code_generator_c_struct(): string;
    abstract code_generator_c_create_param(): string;
    abstract code_generator_c_create_raw_size(): string;
    abstract code_generator_c_create_object(): string;
    abstract code_generator_c_create_raw_data(): string;
    abstract code_generator_c_update_params(): string;
    abstract code_generator_c_update_raw_size(): string;
    abstract code_generator_c_update_object(): string;
    abstract code_generator_c_update_raw_data(): string;
    abstract getType(): string;
}
