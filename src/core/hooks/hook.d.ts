
export type HookName = "before_process" | "after_process";

export type HookRegister = {
    hookName: HookName;
    endpoint: string;
    callback: (req: DAASRequest) => DAASResponse | Promise<DAASResponse>;
}

export type DAASRequest = {
    headers: Record<string, string>;
    requestData: Record<string, string>;
    internalData: Record<string, string>;
}

export type DAASResponse = {
    statusCode: number;
    body?: Buffer;
    headers?: Record<string, string>;
} | void;