import { Glob } from "bun";
import { Endpoint } from "../endpoint/Endpoint";
import type { HookFunction } from "../hooks/HookFunction";
import { scan_endpoints } from "../scanner/scan_endpoints";
import { Application, DEFAULT_ENDPOINT_FOLDER, DEFAULT_HOOK_FOLDER, DEFAULT_SCHEMA_FOLDER } from "./Application";
import path from "path"
import { scan_schemas } from "../scanner/scan_schemas";
import { scan_hook_functions } from "../scanner/scan_hook_functions";
import type { Hook } from "../hooks/Hook";
import type { Schema } from "../schema/Schema";

export class ApplicationObjects {

    private static glob: Glob = new Glob("**/*");

    private static Hooks:         Hook[] = [];
    private static HookFunctions: Map<string, HookFunction> = new Map();
    private static Endpoints:     Map<HttpTarget, Map<HttpMethod, boolean>> = new Map();
    private static Schemas:       Map<string, Schema>     = new Map();

    static getEndpoints(){
        const ret: Endpoint[] = [];
        const targets = ApplicationObjects.Endpoints.entries();
        targets.every(target => {
            ret.push(new Endpoint(target[0], target[1].keys().toArray()))
        })
        return ret;
    }

    static getHooks(){
        return ApplicationObjects.Hooks;
    }

    static getSchemas(){
        return ApplicationObjects.Schemas.values().toArray();
    }

    static getHookFunction(name: string){
        return ApplicationObjects.HookFunctions.get(name);
    }

    static register_hook(hook: Hook) {
        ApplicationObjects.Hooks.push(hook);
    }

    static async scan_endpoints(){
        ApplicationObjects.Endpoints.forEach(m => m.clear());
        ApplicationObjects.Endpoints.clear();
        const scanRoot = path.join(Application.cwd, DEFAULT_ENDPOINT_FOLDER);
        const files = Array.from(ApplicationObjects.glob.scanSync({
            cwd: scanRoot,
            onlyFiles: true,
            absolute: true
        }));
        const endpoints = await scan_endpoints(files);
        for ( const endpoint of endpoints ) {
            if ( !ApplicationObjects.Endpoints.has(endpoint.getTarget())){
                ApplicationObjects.Endpoints.set(endpoint.getTarget(), new Map())
            }
            const map = ApplicationObjects.Endpoints.get(endpoint.getTarget())!;
            for ( const method of endpoint.getMethods() ){
                if ( map.get(method) ){
                    console.error("[ERROR] The Endpoint", endpoint.getTarget(), "for the method", method ,"already exists, please remove it");
                    continue;
                }
                map.set(method, true);
            }
        }
    }

    static async scan_schemas(){
        ApplicationObjects.Schemas.clear();
        const regex_validation_name = /[a-zA-Z0-9_-]{2,64}/;
        const scanRoot = path.join(Application.cwd, DEFAULT_SCHEMA_FOLDER);
        const files = Array.from(ApplicationObjects.glob.scanSync({
            cwd: scanRoot,
            onlyFiles: true,
            absolute: true
        }));
        const schemas = await scan_schemas(files);
        for ( const schema of schemas ){
            if ( !regex_validation_name.test( schema.getName()) ){
                console.error("[ERROR] The Schema name", schema.getName(), "is not valid, please check name");
                continue;
            }
            if ( ApplicationObjects.Schemas.has(schema.getName()) ){
                console.error("[ERROR] The Schema", schema.getName(), "already exists, please change name");
                continue;
            }
            ApplicationObjects.Schemas.set(schema.getName(), schema)
        }
    }

    static async scan_hook_functions(){
        ApplicationObjects.HookFunctions.clear();
        console.log(ApplicationObjects.HookFunctions.size)
        const directory_to_scan = path.join(Application.cwd, DEFAULT_HOOK_FOLDER);
        const files = Array.from(ApplicationObjects.glob.scanSync({
            cwd: directory_to_scan,
            onlyFiles: true,
            absolute: true
        }));
        const hookFunctions = await scan_hook_functions(files);
        for ( const hookFunction of hookFunctions ){
            if ( ApplicationObjects.HookFunctions.has(hookFunction.getFnName()) ){
                console.error("[ERROR] The Hook Function", hookFunction.getFnName(), "already exists, please change name");
                continue;
            }
            ApplicationObjects.HookFunctions.set(hookFunction.getFnName(), hookFunction)
        }
    }
}