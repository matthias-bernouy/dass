//{{ROUTES_IMPORTS}}

const threadid = Math.random().toString(16).substring(2, 10);

export function Server(){
    Bun.serve({
        port: 3000,
        reusePort: true,
        fetch(request) {
            return new Response(`THREAD ${threadid.toString()} - No route matched`, { status: 404 });
        },
        routes: {
//{{ROUTES_CALLS}}
        }
    })
}