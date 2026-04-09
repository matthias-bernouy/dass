/** * Represents the handler function for an endpoint.
 * It can return a standard Response or a Promise of a Response.
 */
export type RouteHandler = (req: Request) => Response | Promise<Response>;

/**
 * Middleware function that can transform a request or intercept a response.
 */
export type Middleware = (req: Request, next: () => Promise<Response>) => Promise<Response>;

export interface IBe5_Runner {
    /** * Registers a new HTTP endpoint.
     * @param method HTTP verb (GET, POST, PUT, DELETE, etc.)
     * @param path The URL path (can include dynamic segments like /article/:id)
     * @param handler The function to execute when the route is matched
     */
    addEndpoint(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, handler: RouteHandler, middleware?: Middleware[]): void;

    /** * Adds a global middleware that runs before every request.
     * Useful for logging, CORS, or global security headers.
     */
    use(middleware: Middleware): void;

    /** * Groups routes under a common prefix and/or middleware.
     * Useful for plugins that provide multiple endpoints (e.g., /api/v1/auth/*)
     */
    group(prefix: string, callback: (runner: IBe5_Runner) => void, middlewares?: Middleware[]): void;

    /** * Helper for quick GET route registration
     */
    get(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** * Helper for quick POST route registration
     */
    post(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** * Helper for quick Patch route registration
     */
    patch(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** * Helper for quick Delete route registration
     */
    delete(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    /** * Helper for quick Put route registration
     */
    put(path: string, handler: RouteHandler, middlewares?: Middleware[]): void;

    start(): void;
}