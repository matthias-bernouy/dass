import type { BunRequest } from "bun";
export declare const baseDASSRequest: (bunRequest: BunRequest) => Promise<{
    req: BunRequest<string>;
    queryParams: Record<string, string>;
    pathParams: {
        [x: string]: string;
    };
    data: {
        transactionID: bigint;
    };
}>;
