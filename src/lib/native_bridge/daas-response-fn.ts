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
    if ( code === 3 ) return false
    if ( code === 4 ) return true
    if ( code === 100001 ) return true
    if ( code === 100002 ) return false
    const message = DaasResponseCode[code] || "Unknown error code";
    throw new Error(`DAAS Error ${code}: ${message}`);
}