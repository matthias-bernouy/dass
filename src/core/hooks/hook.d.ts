
export type HookName = "before_process" | "after_process";

export type HookRegister = {
    hookName: HookName;
    endpoint: string; // Should be * or User/* or */get
    callback: (req: HookRequest) => HookResponse | Promise<HookResponse>;
    priority?: number; // Higher priority hooks run first. Default is 0.
}

export type HookRequest = {
    headers: Record<string, string>;
    data: Record<string, string>;
}

export type HookResponse = {
    statusCode: number;
    body?: Buffer<ArrayBuffer>;
    headers?: Record<string, string>;
} | void;