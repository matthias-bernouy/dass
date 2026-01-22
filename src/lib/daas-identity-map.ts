import { DaasResponseCode, processResponse, throwErrorCode } from "./daas-response-code";
import { symbols } from "./dass-dlopen";
import { ptr } from "bun:ffi";


export class IdentityMap {

    static link(key: any, value: bigint, tx_id: bigint) {
        // In the future, we will reuse allocated memory for keys
        const buffer = Buffer.from(key);
        return symbols.link_key_identity_map(ptr(buffer), buffer.length, value, tx_id);
    }

    static exists(key: any): boolean {
        const buffer = Buffer.from(key);
        const res = symbols.key_exists_identity_map(ptr(buffer), buffer.length);
        return processResponse(res);
    }

}