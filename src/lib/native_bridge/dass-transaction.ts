import { processIdentifierResponse, processResponse } from "./daas-response-fn";
import { symbols } from "./dass-dlopen";

export class Transaction {

    static create(): bigint {
        const res = symbols.create_tx();
        return processIdentifierResponse(res);
    }

    static commit(tx_id: bigint): boolean {
        const res = symbols.commit_tx(tx_id);
        return processResponse(res);
    }

    static abort(tx_id: bigint): boolean {
        const res = symbols.abort_tx(tx_id);
        return processResponse(res);
    }

}