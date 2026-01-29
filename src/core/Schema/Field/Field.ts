

export abstract class Field {

    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    getName(): string {
        return this.name;
    }

    abstract code_generator_c_struct_line(): string;
    abstract code_generator_c_setter_line(): string;
    abstract code_generator_ts_get_method(): string;
    abstract code_generator_ts_set_method(): string;

    abstract getType(): string;
}