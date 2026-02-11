import { Field } from "./Field";


export class NumberField extends Field {

    constructor(fieldName: string) {
        super(fieldName);
    }

    getType(): string {
        return "number";
    }

    code_generator_ts_http_pre_call_POST(): string {
        return `const ${this.getName()} = parseInt(DAASRequest.requestData["${this.getName()}"] || "0");`;
    }

    code_generator_ts_http_call_params_POST(): string {
        return `${this.getName()}`;
    }

    code_generator_ts_http_post_call_POST(): string {
        return ``;
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
        return `FFIType.u64`;
    }

    code_generator_ts_update(): string {
        return `FFIType.u64`;
    }


    code_generator_c_get_as_json(): string {
        return `
        	memcpy(json_output + json_cpt, "\\"${this.getName()}\\":", ${this.getName().length + 3});
            json_cpt += ${this.getName().length + 3};
            memcpy(json_output + json_cpt, "\\"", 1);
            json_cpt += 1;
            char ${this.getName()}_str[21];
            sprintf(${this.getName()}_str, "%lu", element->${this.getName()});
            memcpy(json_output + json_cpt, ${this.getName()}_str, strlen(${this.getName()}_str));
            json_cpt += strlen(${this.getName()}_str);
            memcpy(json_output + json_cpt++, "\\"", 1);
        `;
    }

    code_generator_c_struct(): string {
        return `\tuint64_t ${this.getName()};`;
    }



    code_generator_c_create_param(): string {
        return `uint64_t ${this.getName()}`;
    }

    code_generator_c_create_raw_size(): string {
        return "";
    }

    code_generator_c_create_object(): string {
        return `\telement->${this.getName()} = ${this.getName()};`;
    }

    code_generator_c_create_raw_data(): string {
        return "";
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