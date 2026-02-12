import { Field } from "./Field";

export class StringField extends Field {

    constructor(fieldName: string) {
        super(fieldName);
    }

    getType(): string {
        return "string";
    }

    code_generator_ts_http_pre_call_POST(): string {
        return `
            const buffer${this.getName()} = bufferPool4096bytes.acquire();
            const length${this.getName()} = buffer${this.getName()}.write(DAASRequest.requestData["${this.getName()}"] || "");
        `;
    }

    code_generator_ts_http_call_params_POST(): string {
        return `length${this.getName()}, buffer${this.getName()}`;
    }

    code_generator_ts_http_post_call_POST(): string {
        return `bufferPool4096bytes.release(buffer${this.getName()});`;
    }

    code_generator_ts_http_pre_call_PATCH(): string {
        return this.code_generator_ts_http_pre_call_POST();
    }

    code_generator_ts_http_call_params_PATCH(): string {
        return this.code_generator_ts_http_call_params_POST();
    }

    code_generator_ts_http_post_call_PATCH(): string {
        return this.code_generator_ts_http_post_call_POST();
    }

    code_generator_ts_create(): string {
        return `FFIType.u32, FFIType.ptr`;
    }

    code_generator_ts_update(): string {
        return `FFIType.u32, FFIType.ptr`;
    }



    code_generator_c_struct(): string {
        return `\tuint32_t ${this.getName()}_length;`;
    }

    code_generator_c_get_as_json(): string {
        return `
        	memcpy(json_output + json_cpt, "\\"${this.getName()}\\":", ${this.getName().length + 3});
            json_cpt += ${this.getName().length + 3};
            memcpy(json_output + json_cpt, "\\"", 1);
            json_cpt += 1;
            memcpy(json_output + json_cpt, &element->raw[raw_cpt], element->${this.getName()}_length);
            json_cpt += element->${this.getName()}_length;
            memcpy(json_output + json_cpt++, "\\"", 1);
        `;
    }

    code_generator_c_create_param(): string {
        return `uint32_t ${this.getName()}_length, char* ${this.getName()}`;
    }

    code_generator_c_create_raw_size(): string {
        return `${this.getName()}_length`;
    }

    code_generator_c_create_object(): string {
        return `\telement->${this.getName()}_length = ${this.getName()}_length;`;
    }

    code_generator_c_create_raw_data(): string {
        return `
\tmemcpy(&element->raw[cpt_raw], ${this.getName()}, ${this.getName()}_length);
\tcpt_raw += ${this.getName()}_length;
        `;
    }


    code_generator_c_update_params(): string {
        return this.code_generator_c_create_param();
    }
    code_generator_c_update_raw_size(): string {
        return this.code_generator_c_create_raw_size();
    }
    code_generator_c_update_object(): string {
        return this.code_generator_c_create_object();
    }
    code_generator_c_update_raw_data(): string {
        return this.code_generator_c_create_raw_data();
    }

    
}