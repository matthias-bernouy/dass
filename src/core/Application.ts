import type { HookRegister } from "./hooks/hook";
import type { Schema } from "./schema/Schema";
import path from "path";
import { cpSync, glob } from "fs";
import { library_dir, resources_dir } from "src/utilities/Global";
import { Glob } from "bun";
import { getTSFileInfo } from "src/utilities/getTSFileInfo";
import { scannerSchemas } from "./scanner/scannerSchemas";
import { smartCopy } from "src/utilities/smartCopy";

const CODE_GENERATED_DIR = path.join(process.cwd(), "node_modules", ".dass-generated");

const DEFAULT_CONFIG_FOLDER = "./config";
const DEFAULT_SCHEMA_FOLDER = "./schema";

export class Application {

    private schemas: Schema[];
    private hooks:   HookRegister[];
    private glob: Glob;
    public static cwd: string = process.cwd();

    static get code_generated_dir(): string {
        return path.join(Application.cwd, "node_modules", ".dass-generated");
    }

    static get types_generated_dir(): string {
        return path.join(Application.cwd, "node_modules", "@types", ".dass-generated");
    }

    constructor(cwd?: string) {
        this.schemas = [];
        this.hooks = [];
        this.glob = new Glob(`**/*`);
        Application.cwd = cwd || process.cwd();

        const files = Array.from(this.glob.scanSync({
            cwd: path.join(resources_dir, "c"),
            onlyFiles: true,
            absolute: true
        }));

        for (let i = 0; i < files.length; i++) {
            smartCopy(files[i]!, path.join(Application.code_generated_dir, "c", path.relative(path.join(resources_dir, "c"), files[i]!)));
        }

        smartCopy(path.join(resources_dir, "Makefile"), path.join(Application.code_generated_dir, "Makefile"));
        
    }

    registerSchema(schema: Schema) {
        this.schemas.push(schema);
    }
    // Hooks
    // Schemas
    // Plugins


    async scan_schemas(){
        this.schemas = [];
        const scanRoot = path.join(Application.cwd, DEFAULT_SCHEMA_FOLDER);
        const files = Array.from(this.glob.scanSync({
            cwd: scanRoot,
            onlyFiles: true,
            absolute: true
        }));

        const schemas = await scannerSchemas(files);
        this.schemas.push(...schemas);
    }


    build(){
        const start = Bun.nanoseconds();

        for (let i = 0; i < this.schemas.length; i++){
            this.schemas[i]!.generate_c();
        }

        Bun.spawnSync(["make", "dev"], {
            cwd: Application.code_generated_dir,
            stdout: "ignore",
            stderr: "ignore",
        })

        const end = Bun.nanoseconds();
        const duration = (end - start) / 1e6;
        console.log(`[INFO] Reloading completed in ${duration.toFixed(0)} milliseconds...`);

    }
}