//{{ROUTES_IMPORTS}}

export type DAASRequest = {
    headers: Record<string, string>;
    requestData: Record<string, string>;
    internalData: Record<string, string>;
    resourceID: Buffer;
    transactionID: bigint;
}

export type DAASResponse = {
    statusCode: number;
    body?: Buffer;
    headers?: Record<string, string>;
} | void;

export function Server(){
    Bun.serve({
        port: 3000,
        fetch(request) {
            return new Response(`You requested ${request.url} with method ${request.method}`);
        },
        routes: {
//{{ROUTES_CALLS}}
        }
    })
}