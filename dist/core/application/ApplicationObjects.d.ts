import { Endpoint } from "../endpoint/Endpoint";
import type { HookFunction } from "../hooks/HookFunction";
import type { Hook } from "../hooks/Hook";
import type { Schema } from "../schema/Schema";
export declare class ApplicationObjects {
    private static glob;
    private static Hooks;
    private static HookFunctions;
    private static Endpoints;
    private static Schemas;
    static getEndpoints(): Endpoint[];
    static getHooks(): Hook[];
    static getSchemas(): Schema[];
    static getHookFunction(name: string): HookFunction | undefined;
    static register_hook(hook: Hook): void;
    static scan_endpoints(): Promise<void>;
    static scan_schemas(): Promise<void>;
    static scan_hook_functions(): Promise<void>;
}
