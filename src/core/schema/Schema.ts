import { existsSync, mkdirSync } from "fs";
import type { Field } from "./Field/Field";
import { NumberField } from "./Field/NumberField";
import { StringField } from "./Field/StringField";
import path from "path";
import { Application } from "../Application";
import { c_schema_generator } from "./Generator/c/c_schema_generator";
import { ts_ffi_methods_generator } from "./Generator/ts/ts_ffi_methods_generator";
import { http_methods_generator } from "./Generator/ts/http_methods_generator";
import { smartFileWriter } from "./Generator/smartFileWriter";

type SchemaOptions = {
    defaultZone: number;
}

export class Schema {

    private name: string;
    private fields: Field[];
    private options: SchemaOptions;
    private schemaID: number;

    private constructor(name: string, schemaID: number, options?: SchemaOptions) {
        this.name = name;
        this.fields = [];
        this.schemaID = schemaID;
        this.options = options || { defaultZone: 0 };
    }

    static create(name: string, schemaID: number, opts?: SchemaOptions): Schema {
        return new Schema(name, schemaID, opts);
    }


    // Fields
    String(fieldName: string): Schema {
        this.fields.push(new StringField(fieldName));
        return this;
    }

    Number(fieldName: string): Schema {
        this.fields.push(new NumberField(fieldName));
        return this;
    }

    getSchemaID(): number {
        return this.schemaID;
    }

    getName(): string {
        return this.name;
    }

    getFields(): Field[] {
        return this.fields;
    }

    getOptions(): SchemaOptions {
        return this.options;
    }

    generate_get_as_json(){
        return "";
    }

    async generate_ts_http_methods(): Promise<void> {
        return smartFileWriter(
            path.join(Application.code_generated_dir, "ts", "routes", `${this.name.toLowerCase()}_routes.ts`), 
            http_methods_generator(this)
        );
    }

    generate_ts_ffi_methods(): string {
        return ts_ffi_methods_generator(this);
    }

    async generate_c(): Promise<void> {
        return smartFileWriter(
            path.join(Application.code_generated_dir, "c", `${this.name.toLowerCase()}.c`), 
            c_schema_generator(this)
        );
    }
}

