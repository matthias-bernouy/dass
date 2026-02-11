//{{ROUTES_IMPORTS}}

export type DAASRequest = {
    readonly standard: Request;
    readonly headers: Record<string, string>;
    readonly requestData: Record<string, string>;
    middlewareData: Record<string, string>;
    transactionID: bigint;
}

export type DAASResponse = {
    statusCode: number;
    body?: string;
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