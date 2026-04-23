import type { ProviderContext } from "../../interfaces/ProviderContext";

/**
 * `GET {prefix}/admin/api/buckets` — admin-gated JSON list of buckets
 * consumed by the admin dashboard page. Drops `secretHash` (and never
 * touches the raw secret, which the provider never stores) so the shape
 * is always safe to forward to the browser.
 */
export async function listBuckets(ctx: ProviderContext, req: Request): Promise<Response> {
    const gate = await ctx.requireAdmin(req);
    if (gate instanceof Response) return gate;

    const buckets = await ctx.buckets.list();
    return Response.json({
        ok: true,
        data: buckets.map((b) => ({
            id:                b.id,
            name:              b.name,
            maxFileSize:       b.maxFileSize,
            acceptedMimeTypes: b.acceptedMimeTypes,
            createdAt:         b.createdAt.toISOString(),
            updatedAt:         b.updatedAt.toISOString(),
        })),
    });
}
