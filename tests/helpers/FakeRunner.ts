import type { Runner, RouteHandler, Middleware } from "../../src/Runner/Runner";

type Route = {
    method: string;
    path: string;
    handler: RouteHandler;
    middlewares: Middleware[];
};

function urlJoin(...parts: string[]): string {
    return ("/" + parts.join("/")).replace(/\/+/g, "/") || "/";
}

/**
 * Minimal in-process Runner for tests. Captures registered routes and lets
 * callers invoke them via `dispatch(method, pathname, init)` without spinning
 * up a real HTTP server.
 */
export class FakeRunner implements Runner {
    public routes: Route[] = [];
    private _globalMiddlewares: Middleware[] = [];

    addEndpoint(method: string, path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
        this.routes.push({ method, path: urlJoin(path), handler, middlewares });
    }

    use(middleware: Middleware): void {
        this._globalMiddlewares.push(middleware);
    }

    group(prefix: string, callback: (runner: Runner) => void, middlewares: Middleware[] = []): void {
        const currentPrefix = urlJoin(prefix);
        const currentMiddlewares = middlewares;

        const scoped: Runner = {
            ...this,
            addEndpoint: (m, p, h, mw = []) =>
                this.addEndpoint(m, urlJoin(currentPrefix, p), h, [...currentMiddlewares, ...mw]),
            get: (p, h, mw) => scoped.addEndpoint("GET", p, h, mw),
            post: (p, h, mw) => scoped.addEndpoint("POST", p, h, mw),
            put: (p, h, mw) => scoped.addEndpoint("PUT", p, h, mw),
            delete: (p, h, mw) => scoped.addEndpoint("DELETE", p, h, mw),
            patch: (p, h, mw) => scoped.addEndpoint("PATCH", p, h, mw),
            group: (p, c, mw = []) => this.group(urlJoin(currentPrefix, p), c, [...currentMiddlewares, ...mw]),
        };

        callback(scoped);
    }

    get(path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("GET", path, handler, mw); }
    post(path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("POST", path, handler, mw); }
    put(path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("PUT", path, handler, mw); }
    delete(path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("DELETE", path, handler, mw); }
    patch(path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("PATCH", path, handler, mw); }

    start(): void { /* no-op for tests */ }

    async dispatch(method: string, url: string, init?: RequestInit): Promise<Response> {
        const pathname = new URL(url).pathname;
        const route = this.routes.find((r) => r.method === method && r.path === pathname);
        if (!route) return new Response("Not Found", { status: 404 });

        const req = new Request(url, { ...init, method });
        const chain = [...this._globalMiddlewares, ...route.middlewares];
        let i = 0;
        const next = async (): Promise<Response> => {
            if (i < chain.length) {
                const mw = chain[i++]!;
                return mw(req, next);
            }
            return route.handler(req);
        };
        return next();
    }
}
