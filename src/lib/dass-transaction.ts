import { symbols } from "./dass-dlopen";

export class Transaction {

    static create(): bigint {
        return symbols.create_transaction();
    }

    static commit(tx_id: bigint): bigint {
        return symbols.commit_transaction(tx_id);
    }

}