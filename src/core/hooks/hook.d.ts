
export type HookName = "before_process" | "after_process";

export type HookRegister = {
    hookName: HookName;
    endpoint: string; // Should be * or User/* or */get
    callback: (req: HookRequest) => HookResponse | Promise<HookResponse>;
}

export type HookRequest = {
    endpoint: string;
    method: string;
    body: Buffer<ArrayBuffer>;
    headers: Record<string, string>;
    queryParams: Record<string, string>;
}

export type HookResponse = {
    statusCode: number;
    body?: Buffer<ArrayBuffer>;
    headers?: Record<string, string>;
}