

export abstract class Field {

    protected fieldName: string;

    constructor(fieldName: string) {
        this.fieldName = fieldName;
    }

    getName(): string {
        return this.fieldName;
    }

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