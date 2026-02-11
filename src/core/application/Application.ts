import path from "path";
import { Glob } from "bun";
import { scan_schemas } from "../scanner/scan_schemas";
import { watch } from "fs";
import { scan_endpoints } from "../scanner/scan_endpoints";
import { generate_http_server } from "./generator/generate_http_server";
import { generate_schemas } from "./generator/generate_schemas";
import { generate_structure } from "./generator/generate_structure";

const DEFAULT_CONFIG_FOLDER = "./dass/config";
const DEFAULT_SCHEMA_FOLDER = "./dass/schema";
const DEFAULT_ENDPOINT_FOLDER = "./dass/endpoint";

export class Application {

    private glob: Glob;
    public static cwd: string = process.cwd();

    static get code_generated_dir(): string {
        return path.join(Application.cwd, "node_modules", ".dass-generated");
    }

    static get types_generated_dir(): string {
        return path.join(Application.cwd, "node_modules", "@types", ".dass-generated");
    }

    constructor(cwd?: string) {
        this.glob = new Glob(`**/*`);
        Application.cwd = cwd || process.cwd();
        generate_structure(this);
    }

    getGlob(): Glob {
        return this.glob;
    }

    async scan_endpoints(){
        const scanRoot = path.join(Application.cwd, DEFAULT_ENDPOINT_FOLDER);
        const files = Array.from(this.glob.scanSync({
            cwd: scanRoot,
            onlyFiles: true,
            absolute: true
        }));
        return await scan_endpoints(files);
    }

    async scan_schemas(){
        const scanRoot = path.join(Application.cwd, DEFAULT_SCHEMA_FOLDER);
        const files = Array.from(this.glob.scanSync({
            cwd: scanRoot,
            onlyFiles: true,
            absolute: true
        }));

        return await scan_schemas(files);
    }

    dev(){
        let w = watch(path.join(Application.cwd, DEFAULT_SCHEMA_FOLDER), { recursive: true });

        w.addListener('change', async () => {
            await this.build();
            w = watch(path.join(Application.cwd, DEFAULT_SCHEMA_FOLDER), { recursive: true });
        });

        this.build();
    }

    async build(){
        const start = Bun.nanoseconds();

        const promises = [];

        promises.push(generate_http_server(this));
        promises.push(generate_schemas(this));

        await Promise.all(promises);

        Bun.spawnSync(["make", "dev"], {
            cwd: Application.code_generated_dir,
            stdout: "inherit",
            stderr: "inherit",
        })

        const end = Bun.nanoseconds();
        const duration = (end - start) / 1e6;
        
        console.log(`[INFO] Reloading completed in ${duration.toFixed(0)} milliseconds...`);
        const module = await import(Application.code_generated_dir + "/ts/Server.raw.ts");
        module.Server();
    }
}