import type { Field } from "./Field/Field";
import { NumberField } from "./Field/NumberField";
import { StringField } from "./Field/StringField";
import TEMPLATE_C from "./Template/C_FILE.txt";

type SchemaOptions = {
    defaultZone: number;
}

export class Schema {

    private name: string;
    private fields: Field[];
    private options: SchemaOptions;

    private constructor(name: string, options?: SchemaOptions) {
        this.name = name;
        this.fields = [];
        this.options = options || { defaultZone: 0 };
    }

    static create(name: string, opts?: SchemaOptions): Schema {
        return new Schema(name, opts);
    }

    String(fieldName: string): Schema {
        this.fields.push(new StringField(fieldName));
        return this;
    }

    Number(fieldName: string): Schema {
        this.fields.push(new NumberField(fieldName));
        return this;
    }

    generate(): string {
        let c = TEMPLATE_C;
        c = this.processBase(c);
        c = this.processCreate(c);
        c = this.processUpdate(c);

        Bun.file(`native/src/generated/${this.name.toLowerCase()}.c`).write(c);
        return c;
    }

    private mapAndJoin(separator: string, callback: (field: any) => string): string {
        return this.fields
            .map(callback)
            .filter(val => val !== undefined && val !== null && val.trim() !== "")
            .join(separator);
    }

    private processBase(template: string): string {
        let struct = this.mapAndJoin("\n", f => f.code_generator_c_struct());
        return template
            .replaceAll("Template", this.name)
            .replaceAll("Template*", `${this.name}*`)
            .replaceAll("template", `${this.name.toLowerCase()}`)
            .replace("static const uint16_t DEF_ZONE_ID = 0;//Generated", `static const uint16_t DEF_ZONE_ID = ${this.options.defaultZone};`)
            .replace("static const uint16_t SCHEMA_ID   = 0;//Generated", `static const uint16_t SCHEMA_ID   = 1;`)
            .replace("{{STRUCTS}}", struct);
    }

    private processCreate(template: string): string {
        let params          = this.mapAndJoin(", ", f => f.code_generator_c_create_param());
        let raw_size        = this.mapAndJoin(" + ", f => f.code_generator_c_create_raw_size());
        let create_object   = this.mapAndJoin("\n", f => f.code_generator_c_create_object());
        let create_raw_data = this.mapAndJoin("\n", f => f.code_generator_c_create_raw_data());
        return template
            .replace("{{CREATE_PARAMS}}", params + (params ? ", " : ""))
            .replace("const uint64_t create_raw_size = 0;//Generated", `const uint64_t create_raw_size = ${raw_size};`)
            .replace("{{CREATE_OBJECT}}", create_object)
            .replace("{{CREATE_RAW_DATA}}", create_raw_data);
    }

    private processUpdate(template: string): string {
        let params          = this.mapAndJoin(", ", f => f.code_generator_c_update_params());
        let raw_size        = this.mapAndJoin(" + ", f => f.code_generator_c_update_raw_size());
        let update_object   = this.mapAndJoin("\n", f => f.code_generator_c_update_object());
        let update_raw_data = this.mapAndJoin("\n", f => f.code_generator_c_update_raw_data());
        return template
            .replace("{{UPDATE_PARAMS}}", params + (params ? ", " : ""))
            .replace("const uint64_t update_raw_size = 0;//Generated", `const uint64_t update_raw_size = ${raw_size};`)
            .replace("{{UPDATE_OBJECT}}", update_object)
            .replace("{{UPDATE_RAW_DATA}}", update_raw_data);
    }

}