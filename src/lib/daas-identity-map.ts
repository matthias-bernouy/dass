import { processResponse } from "./daas-response-fn";
import { symbols } from "./dass-dlopen";
import { ptr } from "bun:ffi";


export class IdentityMap {

    static link(key: any, value: bigint, tx_id: bigint) {
        // In the future, we will reuse allocated memory for keys
        const buffer = Buffer.from(key);
        const res = symbols.link_idmap(ptr(buffer), buffer.length, value, tx_id);
        return processResponse(res);
    }

    static unlink(key: any, tx_id: bigint) {
        const buffer = Buffer.from(key);
        const res = symbols.unlink_idmap(ptr(buffer), buffer.length, tx_id);
        return processResponse(res);
    }

    static exists(key: any): boolean {
        const buffer = Buffer.from(key);
        const res = symbols.exists_idmap(ptr(buffer), buffer.length);
        return processResponse(res);
    }

}