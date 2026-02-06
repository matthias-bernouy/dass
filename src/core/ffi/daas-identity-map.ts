import { ptr } from "bun:ffi";
import { exists_idmap_native, link_idmap_native, unlink_idmap_native } from "./dass-dlopen";
import { processResponse } from "./daas-response-fn";

const bufferWrite = Buffer.prototype.write;
const kBuffer = new Uint8Array(1024); 
const kPtr = ptr(kBuffer);

export function exists_idmap(key: string): boolean {
    const written = bufferWrite.call(kBuffer, key);
    return processResponse(exists_idmap_native(kPtr, written));
}

export function link_idmap(key: string, value: bigint, tx_id: bigint): boolean {
    const written = bufferWrite.call(kBuffer, key);
    return processResponse(link_idmap_native(kPtr, written, value, tx_id));
}

export function unlink_idmap(key: string, tx_id: bigint): boolean {
    const written = bufferWrite.call(kBuffer, key);
    return processResponse(unlink_idmap_native(kPtr, written, tx_id));
}