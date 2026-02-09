import type { HookRegister } from "./hooks/hook";
import type { Schema } from "./schema/Schema";
import path, { join } from "path";
import { library_dir, resources_dir } from "src/utilities/Global";
import { Glob } from "bun";
import { scannerSchemas } from "./scanner/scannerSchemas";
import { smartCopy } from "src/utilities/smartCopy";
import { watch } from "fs";
import SYMBOLS_TS from "src/.dass-generated/ts/ffi_methods.raw" with { type: "text" };

const DEFAULT_CONFIG_FOLDER = "./dass/config";
const DEFAULT_SCHEMA_FOLDER = "./dass/schema";

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

        smartCopy(path.join(library_dir, "src", ".dass-generated", "Makefile"), path.join(Application.code_generated_dir, "Makefile"));
        
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

        console.log(files)
        const schemas = await scannerSchemas(files);
        this.schemas.push(...schemas);
    }

    dev(){
        let w = watch(path.join(Application.cwd, DEFAULT_SCHEMA_FOLDER), { recursive: true });

        w.addListener('change', async (eventType, filename) => {
            console.log(`[INFO] Detected change in ${filename}, rebuilding...`);
            await this.build();
            w = watch(path.join(Application.cwd, DEFAULT_SCHEMA_FOLDER), { recursive: true });
        });

        this.build();
    }

    async build(){
        const start = Bun.nanoseconds();

        let ts_methods = "";
        let ts = SYMBOLS_TS;

        await this.scan_schemas();

        const promises = [];

        for (let i = 0; i < this.schemas.length; i++){
            promises.push(this.schemas[i]!.generate_c());
            ts_methods += this.schemas[i]!.generate_ts_lib();
        }
        
        ts = ts
            .replace("//{{METHODS}}", ts_methods)
            .replace("{{PATH_C}}", join(Application.code_generated_dir, "c_compiled", "libdass.so")); 
        Bun.file(path.join(Application.code_generated_dir, "ts", "ffi_methods.ts")).write(ts);

        await Promise.all(promises);

        Bun.spawnSync(["make", "dev"], {
            cwd: Application.code_generated_dir,
            stdout: "ignore",
            stderr: "ignore",
        })

        const end = Bun.nanoseconds();
        const duration = (end - start) / 1e6;

        
        console.log(`[INFO] Reloading completed in ${duration.toFixed(0)} milliseconds...`);

        smartCopy(path.join(library_dir, "src", ".dass-generated", "ts", "Server.raw.ts"), path.join(Application.code_generated_dir, "ts", "Server.raw.ts"));

        const module = await import(Application.code_generated_dir + "/ts/Server.raw.ts");
        module.Server();

    }
}