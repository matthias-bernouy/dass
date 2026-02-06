import { processIdentifierResponse, processResponse } from "./daas-response-fn";
import { symbols } from "./dass-dlopen";

export function create_tx(): bigint {
    const res = symbols.create_tx();
    return processIdentifierResponse(res);
}

export function commit_tx(tx_id: bigint): boolean {
    const res = symbols.commit_tx(tx_id);
    return processResponse(res);
}

export function abort_tx(tx_id: bigint): boolean {
    const res = symbols.abort_tx(tx_id);
    return processResponse(res);
}