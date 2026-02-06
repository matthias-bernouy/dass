import { Field } from "./Field";


export class NumberField extends Field {

    constructor(fieldName: string) {
        super(fieldName);
    }

    getType(): string {
        return "number";
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