import type { ProviderContext } from "../../interfaces/ProviderContext";
import { redirect } from "../../../../../utilities/html";

/**
 * `POST /admin/buckets/delete?id=<id>` — drop the bucket and wipe every
 * item + byte blob stored under it. Irreversible.
 */
export async function deleteBucket(ctx: ProviderContext, req: Request): Promise<Response> {
    const gate = await ctx.requireAdmin(req);
    if (gate instanceof Response) return gate;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return redirect(`${ctx.prefix}/admin?error=${encodeURIComponent("Bucket id manquant.")}`);

    await ctx.storage.dropBucket(id);
    await ctx.buckets.delete(id);
    return redirect(`${ctx.prefix}/admin/dashboard.html`);
}
