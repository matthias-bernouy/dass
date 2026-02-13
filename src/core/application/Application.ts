import path from "path";
import { watch } from "fs";
import { ApplicationObjects } from "./ApplicationObjects";
import { code_generated_dir } from "./ApplicationPaths";
import { generate_http_server } from "./generator/generate_http_server";
import { generate_schemas } from "./generator/generate_schemas";
import { generate_structure } from "./generator/generate_structure";

export const DASS_FOLDER   = "./dass";
export const DEFAULT_CONFIG_FOLDER   = "./dass/config";
export const DEFAULT_SCHEMA_FOLDER   = "./dass/schema";
export const DEFAULT_ENDPOINT_FOLDER = "./dass/endpoint";
export const DEFAULT_HOOK_FOLDER     = "./dass/hooks";

export class Application {

    private static lastRunner: Function | undefined;
    public static cwd: string = process.cwd();

    static dev(cwd?: string){
        if (cwd){
            Application.cwd = cwd;
        }

        generate_structure();

        let watchSchemas = watch(path.join(Application.cwd, DASS_FOLDER), { recursive: true });

        watchSchemas.addListener('change', async () => {
            await Application.build();
            watchSchemas = watch(path.join(Application.cwd, DASS_FOLDER), { recursive: true });
        });

        this.build();
    }

    static async build(){
        if (Application.lastRunner){
            Application.lastRunner.call([])
        }
        let promises;

        await process_with_timing("Scan resources", async () => {
            promises = [];
            promises.push(ApplicationObjects.scan_hook_functions());
            promises.push(ApplicationObjects.scan_endpoints());
            promises.push(ApplicationObjects.scan_schemas());
            await Promise.all(promises);
        })

        await process_with_timing("Build files", async () => {
            promises = [];
            promises.push(generate_http_server());
            promises.push(generate_schemas());
            await Promise.all(promises);
        })

        await process_with_timing("Compiling C library", () => {
            Bun.spawnSync(["make", "dev"], {
                cwd: code_generated_dir(),
                stdout: "ignore",
                stderr: "ignore",
            })
        })

        const module = await import(code_generated_dir() + "/ts/application.ts" + `?update=${Date.now()}`);
        const stop = module.AppRunner().stop;
        Application.lastRunner = stop;
    }
}

async function process_with_timing(str: string, cb: () => Promise<any> | any){
    let start, end, duration;
    start = Bun.nanoseconds();
    await cb();
    end = Bun.nanoseconds();
    duration = (end - start) / 1e6;
    console.log(`[INFO] ${str} in ${duration.toFixed(0)} milliseconds...`);
}