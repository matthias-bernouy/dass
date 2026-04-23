import type { ProviderContext } from "../../interfaces/ProviderContext";
import { randomBase64Url, sha256Hex } from "../../../../../../utilities/crypto";
import { redirect } from "../../../../../../utilities/html";

/**
 * `POST /admin/buckets` (multipart/form-data, `name`) — create a bucket.
 * Generates a fresh shared secret (SHA-256 stored, raw value surfaced once
 * in the redirect query string so the operator can copy it).
 */
export async function createBucket(ctx: ProviderContext, req: Request): Promise<Response> {
    const gate = await ctx.requireAdmin(req);
    if (gate instanceof Response) return gate;

    const form = await req.formData();
    const name = (form.get("name")?.toString() ?? "").trim();
    const dashboard = `${ctx.prefix}/admin/dashboard.html`;
    if (!name)             return redirect(`${dashboard}?error=${encodeURIComponent("Nom requis.")}`);
    if (name.length > 120) return redirect(`${dashboard}?error=${encodeURIComponent("Nom trop long.")}`);

    const secret = randomBase64Url(32);
    const bucket = await ctx.buckets.create({
        name,
        secretHash:        await sha256Hex(secret),
        maxFileSize:       ctx.defaultMaxFileSize,
        acceptedMimeTypes: ctx.defaultAcceptedMimeTypes,
    });

    return redirect(
        dashboard
        + `?newSecret=${encodeURIComponent(secret)}`
        + `&newBucketId=${encodeURIComponent(bucket.id)}`,
    );
}
