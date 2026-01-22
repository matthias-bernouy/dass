import { processIdentifierResponse, processResponse } from "./daas-response-code";
import { symbols } from "./dass-dlopen";

export class Transaction {

    static create(): bigint {
        const res = symbols.create_transaction();
        return processIdentifierResponse(res);
    }

    static commit(tx_id: bigint): boolean {
        const res = symbols.commit_transaction(tx_id);
        return processResponse(res);
    }

}