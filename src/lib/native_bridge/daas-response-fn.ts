import { DaasResponseCode } from "./daas-responses";

export function processIdentifierResponse(code: bigint): bigint {
    const numCode = Number(code);
    if ( numCode > 1000 ) return code;
    const message = DaasResponseCode[numCode] || "Unknown error code";
    throw new Error(`DAAS Error ${numCode}: ${message}`);
}

export function processResponse(code: number): boolean {
    if ( code === 0 ) return false
    if ( code === 1 ) return true
    const message = DaasResponseCode[code] || "Unknown error code";
    throw new Error(`DAAS Error ${code}: ${message}`);
}