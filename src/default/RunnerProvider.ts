import { join } from "node:path";
import type { Runner, RouteHandler, Middleware } from "../interfaces/Runner";

export class Be5_Runner implements Runner {
    private routes: Array<{
        method: string;
        path: string;
        handler: RouteHandler;
        middlewares: Middleware[];
    }> = [];

    private globalMiddlewares: Middleware[] = [];

    addEndpoint(method: string, path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
        const fullPath = (path).replace(/\/+/g, "/") || "/";

        this.routes.push({
            method,
            path: fullPath,
            handler,
            middlewares: middlewares,
        });
    }

    use(middleware: Middleware): void {
        this.globalMiddlewares.push(middleware);
    }

    group(prefix: string, callback: (runner: Runner) => void, middlewares: Middleware[] = []) {

        const currentPrefix = (prefix).replace(/\/+/g, "/");
        const currentMiddlewares = middlewares;

        const scopedRunner: Runner = {
            ...this,
            addEndpoint: (method, path, handler, middleware = []) => {
                this.addEndpoint(method, currentPrefix + path, handler, [...currentMiddlewares, ...middleware]);
            },
            get: (p, h, m) => scopedRunner.addEndpoint('GET', p, h, m),
            post: (p, h, m) => scopedRunner.addEndpoint('POST', p, h, m),
            put: (p, h, m) => scopedRunner.addEndpoint('PUT', p, h, m),
            delete: (p, h, m) => scopedRunner.addEndpoint('DELETE', p, h, m),
            patch: (p, h, m) => scopedRunner.addEndpoint('PATCH', p, h, m),
            
            group: (p, c, m) => {
                this.group(join(currentPrefix, p), c, [...currentMiddlewares, ...middlewares])
            }
        };

        callback(scopedRunner);
    }

    get(path: string, handler: RouteHandler, middlewares: Middleware[] = []) { this.addEndpoint('GET', path, handler, middlewares); }
    post(path: string, handler: RouteHandler, middlewares: Middleware[] = []) { this.addEndpoint('POST', path, handler, middlewares); }
    patch(path: string, handler: RouteHandler, middlewares: Middleware[] = []) { this.addEndpoint('PATCH', path, handler, middlewares); }
    delete(path: string, handler: RouteHandler, middlewares: Middleware[] = []) { this.addEndpoint('DELETE', path, handler, middlewares); }
    put(path: string, handler: RouteHandler, middlewares: Middleware[] = []) { this.addEndpoint('PUT', path, handler, middlewares); }

    start(port: number = 3000): void {
        const self = this;

        Bun.serve({
            port,
            async fetch(request) {
                const url = new URL(request.url);
                const method = request.method;

                const route = self.routes.find(r =>
                    r.method === method && self.matchPath(r.path, url.pathname)
                );

                if (!route) {
                    return new Response("Not Found", { status: 404 });
                }

                const allMiddlewares = [...self.globalMiddlewares, ...route.middlewares];

                let index = 0;
                const next = async (req: Request): Promise<Response> => {
                    if (index < allMiddlewares.length) {
                        const middleware = allMiddlewares[index++]!;
                        return middleware(req, () => next(req));
                    }
                    return route.handler(req);
                };

                try {
                    return await next(request);
                } catch (e) {
                    console.error(e);
                    return new Response("Internal Server Error", { status: 500 });
                }
            },
        });

        console.log(`🚀 Server started on http://localhost:${port}`);
    }

    private matchPath(routePath: string, requestPath: string): boolean {
        if (routePath === requestPath) return true;

        const routeParts = routePath.split('/');
        const requestParts = requestPath.split('/');

        if (routeParts.length !== requestParts.length) return false;

        return routeParts.every((part, i) => part.startsWith(':') || part === requestParts[i]);
    }
}