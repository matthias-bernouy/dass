import type { Runner, RouteHandler, Middleware } from "../../src/Runner/Runner";

type Route = {
    method: string;
    path: string;
    handler: RouteHandler;
    middlewares: Middleware[];
};

type DefaultRoute = {
    method: string;
    prefix: string;
    handler: RouteHandler;
    middlewares: Middleware[];
};

function urlJoin(...parts: string[]): string {
    return ("/" + parts.join("/")).replace(/\/+/g, "/") || "/";
}

function pathUnderPrefix(pathname: string, prefix: string): boolean {
    if (prefix === "/") return true;
    return pathname === prefix || pathname.startsWith(prefix + "/");
}

/**
 * Minimal in-process Runner for tests. Captures registered routes and lets
 * callers invoke them via `dispatch(method, pathname, init)` without spinning
 * up a real HTTP server. Mirrors `DefaultRunner` closely enough to exercise
 * `Runner.group`, `setDefaultEndpoint`, and middleware stacks.
 */
export class FakeRunner implements Runner {
    public routes: Route[] = [];
    public basePath: string = "/";
    private _globalMiddlewares: Middleware[] = [];
    private _defaultEndpoints: DefaultRoute[] = [];

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
            basePath: currentPrefix,
            addEndpoint: (m, p, h, mw = []) =>
                this.addEndpoint(m, urlJoin(currentPrefix, p), h, [...currentMiddlewares, ...mw]),
            get:    (p, h, mw) => scoped.addEndpoint("GET",    p, h, mw),
            post:   (p, h, mw) => scoped.addEndpoint("POST",   p, h, mw),
            put:    (p, h, mw) => scoped.addEndpoint("PUT",    p, h, mw),
            delete: (p, h, mw) => scoped.addEndpoint("DELETE", p, h, mw),
            patch:  (p, h, mw) => scoped.addEndpoint("PATCH",  p, h, mw),
            group:  (p, c, mw = []) => this.group(urlJoin(currentPrefix, p), c, [...currentMiddlewares, ...mw]),
            setDefaultEndpoint: (m, h, mw = []) =>
                this._registerDefault(m, currentPrefix, h, [...currentMiddlewares, ...mw]),
        };

        callback(scoped);
    }

    get   (path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("GET",    path, handler, mw); }
    post  (path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("POST",   path, handler, mw); }
    put   (path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("PUT",    path, handler, mw); }
    delete(path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("DELETE", path, handler, mw); }
    patch (path: string, handler: RouteHandler, mw: Middleware[] = []) { this.addEndpoint("PATCH",  path, handler, mw); }

    setDefaultEndpoint(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS", handler: RouteHandler, mw: Middleware[] = []): void {
        this._registerDefault(method, "/", handler, mw);
    }

    private _registerDefault(method: string, prefix: string, handler: RouteHandler, mw: Middleware[]): void {
        this._defaultEndpoints = this._defaultEndpoints.filter((d) => !(d.method === method && d.prefix === prefix));
        this._defaultEndpoints.push({ method, prefix, handler, middlewares: mw });
    }

    start(): void { /* no-op for tests */ }

    async dispatch(method: string, url: string, init?: RequestInit): Promise<Response> {
        const pathname = new URL(url).pathname;
        const route = this.routes.find((r) => r.method === method && r.path === pathname);

        const fallback = route ? null : this._defaultEndpoints
            .filter((d) => d.method === method && pathUnderPrefix(pathname, d.prefix))
            .sort((a, b) => b.prefix.length - a.prefix.length)[0] ?? null;

        const effective = route ?? fallback;
        if (!effective) return new Response("Not Found", { status: 404 });

        const req = new Request(url, { ...init, method });
        const chain = [...this._globalMiddlewares, ...effective.middlewares];
        let i = 0;
        const next = async (): Promise<Response> => {
            if (i < chain.length) {
                const mw = chain[i++]!;
                return mw(req, next);
            }
            return effective.handler(req);
        };
        return next();
    }
}
