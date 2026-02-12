export declare const DASS_FOLDER = "./dass";
export declare const DEFAULT_CONFIG_FOLDER = "./dass/config";
export declare const DEFAULT_SCHEMA_FOLDER = "./dass/schema";
export declare const DEFAULT_ENDPOINT_FOLDER = "./dass/endpoint";
export declare const DEFAULT_HOOK_FOLDER = "./dass/hooks";
export declare class Application {
    static cwd: string;
    static dev(cwd?: string): void;
    static build(): Promise<void>;
}
