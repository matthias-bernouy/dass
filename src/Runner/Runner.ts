/**
 * Represents the handler function for an endpoint.
 * It can return a standard Response or a Promise of a Response.
 */
export type RouteHandler = (req: Request) => Response | Promise<Response>;

/**
 * Middleware function that can transform a request or intercept a response.
 */
export type Middleware = (req: Request, next: () => Promise<Response>) => Promise<Response>;

export interface Runner {

    readonly basePath: string;

    /**
     * Registers a new HTTP endpoint.
     * @param method HTTP verb (GET, POST, PUT, DELETE, etc.)
     * @param path The URL path (can include dynamic segments like /article/:id)
     * @param handler The function to execute when the route is matched
     */
    addEndpoint(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, handler: RouteHandler, middleware?: Middleware[]): void;

    /**
     * Adds a global middleware that runs before every request.
     * Useful for logging, CORS, or global security headers.
     */
    use(middleware: Middleware): void;

    /**
     * Groups routes under a common prefix and/or middleware.
     * Useful for plugins that provide multiple endpoints (e.g., /api/v1/auth/*)
     */
    group(prefix: string, callback: (runner: Runner) => void, middlewares?: Middleware[]): void;

    /** Helper for quick GET route registration */
    get(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** Helper for quick POST route registration */
    post(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** Helper for quick PATCH route registration */
    patch(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** Helper for quick DELETE route registration */
    delete(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** Helper for quick PUT route registration */
    put(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /**
     * Sets a fallback handler invoked when no registered route matches the
     * request path but the method matches. Useful for SPA-style catch-alls
     * or asset serving under a prefix that should natively 404 on misses.
     * Subsequent calls replace the previous default.
     */
    setDefaultEndpoint(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        handler: RouteHandler,
        middlewares?: Middleware[]
    ): void;

    start(port?: number): void;
}
