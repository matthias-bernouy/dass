import type { ProviderContext } from "../../interfaces/ProviderContext";
import { randomBase64Url, sha256Hex } from "../../../../../../utilities/crypto";
import { redirect } from "../../../../../../utilities/html";
import { redirectWithFlash } from "../../core/utils";

/**
 * `POST {prefix}/admin/buckets/rotate?id=<id>` — regenerate the bucket's
 * shared secret. The previous secret is invalidated immediately; callers
 * with the old one start failing `/mint` on the next call.
 *
 * On success, redirects back to the referring page (typically the config
 * tab) with `?newSecret=…&newBucketId=…` so the client can show the new
 * value once. Falls back to `{prefix}/admin` when no usable referer exists.
 */
export async function rotateSecret(ctx: ProviderContext, req: Request): Promise<Response> {
    const gate = await ctx.requireAdmin(req);
    if (gate instanceof Response) return gate;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
        return redirectWithFlash(req, `${ctx.prefix}/admin/dashboard.html`, { error: "Bucket id manquant." });
    }

    const existing = await ctx.buckets.getById(id);
    if (!existing) {
        return redirectWithFlash(req, `${ctx.prefix}/admin/dashboard.html`, { error: "Bucket inconnu." });
    }

    const secret = randomBase64Url(32);
    await ctx.buckets.update(id, { secretHash: await sha256Hex(secret) });

    // When no `Referer` is present (tests, direct API calls), land on the
    // admin dashboard so the flash params are still readable.
    const fallback = `${ctx.prefix}/admin/dashboard.html`;
    if (!req.headers.get("referer")) {
        return redirect(
            `${fallback}`
            + `?newSecret=${encodeURIComponent(secret)}`
            + `&newBucketId=${encodeURIComponent(id)}`,
        );
    }
    return redirectWithFlash(req, fallback, {
        newSecret:   secret,
        newBucketId: id,
    });
}
