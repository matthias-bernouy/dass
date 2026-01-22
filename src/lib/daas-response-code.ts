export const DaasResponseCode: Record<number, string> = {

    3: "Not Found",
    4: "Found",

    100001: "Success",

    300009: "No transaction found",
    300010: "Transaction not active",
    300011: "Transaction status error",
}

export function processIdentifierResponse(code: bigint): bigint {
    const numCode = Number(code);
    if ( numCode > 1000 ) return code;
    const message = DaasResponseCode[numCode] || "Unknown error code";
    throw new Error(`DAAS Error ${numCode}: ${message}`);
}

export function processResponse(code: number): boolean {
    if ( code === 3 ) return false
    if ( code === 4 ) return true
    if ( code === 100001 ) return true
    if ( code === 100002 ) return false
    const message = DaasResponseCode[code] || "Unknown error code";
    throw new Error(`DAAS Error ${code}: ${message}`);
}