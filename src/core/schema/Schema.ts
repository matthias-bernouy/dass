import { existsSync, mkdirSync } from "fs";
import type { Field } from "./Field/Field";
import { NumberField } from "./Field/NumberField";
import { StringField } from "./Field/StringField";
import path from "path";
import { Application } from "../Application";
import { c_generator } from "./Generator/cGenerator";
import { tsLib_generator } from "./Generator/ts_lib_methods";

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


    // Fields
    String(fieldName: string): Schema {
        this.fields.push(new StringField(fieldName));
        return this;
    }

    Number(fieldName: string): Schema {
        this.fields.push(new NumberField(fieldName));
        return this;
    }

    // Getters
    getName(): string {
        return this.name;
    }

    getFields(): Field[] {
        return this.fields;
    }

    getOptions(): SchemaOptions {
        return this.options;
    }

    generate_ts_lib(): string {
        return tsLib_generator(this);
    }

    async generate_c(): Promise<void> {

        let c = c_generator(this);

        const fileName = `${this.name.toLowerCase()}.c`;
        const dirPath = path.join(Application.code_generated_dir, "c", "schema");
        const filePath = path.join(dirPath, fileName);
        const hashPath = `${filePath}.hash`;

        const currentHash = Bun.hash(c).toString();

        if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

        const hashFile = Bun.file(hashPath);
        let oldHash = "";
        
        if (await hashFile.exists()) {
            oldHash = await hashFile.text();
        }

        if (currentHash === oldHash && existsSync(filePath)) {
            return;
        }
        
        await Promise.all([
            Bun.write(filePath, c),
            Bun.write(hashPath, currentHash)
        ]);

    }

}

