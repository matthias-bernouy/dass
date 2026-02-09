import { ffi_symbols } from "./ffi_methods.raw";

export function Server(){
    Bun.serve({
        port: 3000,
        fetch(request) {
            return new Response(`You requested ${request.url} with method ${request.method}`);
        },
        routes: {
//{{ROUTES}}
        }
    })
}


/**
 * 
 * 
 *             "/user": {
                GET() {
                    return new Response("Hello World")
                },

                POST() {
                    return new Response("Hello World")
                },

                PUT() {
                    return new Response("Hello World")
                },

                DELETE() {
                    return new Response("Hello World")
                }
            }
 */