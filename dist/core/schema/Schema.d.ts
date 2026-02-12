import type { Field } from "./field/Field";
type SchemaOptions = {
    defaultZone: number;
};
export declare class Schema {
    private name;
    private fields;
    private options;
    private schemaID;
    private constructor();
    static create(name: string, schemaID: number, opts?: SchemaOptions): Schema;
    String(fieldName: string): Schema;
    Number(fieldName: string): Schema;
    getSchemaID(): number;
    getName(): string;
    getFields(): Field[];
    getOptions(): SchemaOptions;
    generate_get_as_json(): string;
    generate_ts_ffi_methods(): string;
    generate_c(): Promise<void>;
}
export {};
