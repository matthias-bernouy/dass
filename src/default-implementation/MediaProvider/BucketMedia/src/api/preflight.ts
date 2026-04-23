import type { ProviderContext } from "../interfaces/ProviderContext";

/**
 * CORS preflight handler registered as the `OPTIONS` default endpoint for
 * the provider's prefix. Echoes the origin (when allow-listed), advertises
 * the supported methods, and reflects whatever headers the client asked
 * about in `Access-Control-Request-Headers`.
 */
export function preflight(ctx: ProviderContext, req: Request): Response {
    const allow = ctx.resolveAllowedOrigin(req.headers.get("origin"));
    if (!allow) return new Response(null, { status: 204 });

    const reqHeaders = req.headers.get("access-control-request-headers")
        ?? "Authorization, Content-Type, X-Bucket-Secret";

    return new Response(null, {
        status:  204,
        headers: {
            "Access-Control-Allow-Origin":  allow,
            "Vary":                         "Origin",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": reqHeaders,
            "Access-Control-Max-Age":       "86400",
        },
    });
}
