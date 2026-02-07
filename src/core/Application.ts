import type { HookRegister } from "./hooks/hook";
import type { Schema } from "./schema/Schema";
import path from "path";
import { cpSync } from "fs";
import { library_dir } from "src/utilities/Global";


export class Application {

    private static instance: Application;

    private schemas: Schema[];
    private hooks:   HookRegister[];

    private constructor() {
        this.schemas = [];
        this.hooks = [];

        console.log(library_dir);
        const target = "node_modules/.dass-generated/c/base";
        const source = path.join(library_dir, "resources/code_c"); // from module resolution
        cpSync(source, target, { recursive: true });
    }

    static getInstance(): Application {
        if (!Application.instance) {
            Application.instance = new Application();
        }
        return Application.instance;
    }

    registerSchema(schema: Schema) {
        this.schemas.push(schema);
    }
    // Hooks
    // Schemas
    // Plugins


    scan(){
        
    }

    build(){

    }
}