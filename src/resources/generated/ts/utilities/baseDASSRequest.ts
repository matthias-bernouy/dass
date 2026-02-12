import type { BunRequest } from "bun";
import { symbols } from "../ffi_methods.raw";

export const baseDASSRequest = async (bunRequest: BunRequest) => {
    const queryParams = {} as Record<string, string>;

    const parser = bunRequest.url.split("?")[1];
    if (parser) {
        const params = new URLSearchParams(parser);
        for (const [key, value] of params.entries()) {
            queryParams[key] = value;
        }
    }

    let ret = {
        req: bunRequest,
        queryParams,
        pathParams: bunRequest.params,
        data: {
            transactionID: symbols.create_tx()
        }
    }

    return ret;
}