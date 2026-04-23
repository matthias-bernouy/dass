import type { BucketConfig } from "../../interfaces/Bucket";
import type { ProviderContext } from "../../interfaces/ProviderContext";
import { redirect } from "../../../../../../utilities/html";

/**
 * `POST /admin/buckets/update?id=<id>` (multipart/form-data) — edit name
 * and/or limits on an existing bucket. `maxFileSize` and `acceptedMimeTypes`
 * are only patched when non-empty, so the operator can edit just the name.
 */
export async function updateBucket(ctx: ProviderContext, req: Request): Promise<Response> {
    const gate = await ctx.requireAdmin(req);
    if (gate instanceof Response) return gate;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return redirect(`${ctx.prefix}/admin?error=${encodeURIComponent("Bucket id manquant.")}`);

    const existing = await ctx.buckets.getById(id);
    if (!existing) return redirect(`${ctx.prefix}/admin?error=${encodeURIComponent("Bucket inconnu.")}`);

    const form = await req.formData();
    const nextName = (form.get("name")?.toString() ?? "").trim();
    const maxRaw   = form.get("maxFileSize")?.toString().trim() ?? "";
    const mimeRaw  = form.get("acceptedMimeTypes")?.toString().trim() ?? "";

    if (!nextName)              return redirect(`${ctx.prefix}/admin?error=${encodeURIComponent("Nom requis.")}`);
    if (nextName.length > 120)  return redirect(`${ctx.prefix}/admin?error=${encodeURIComponent("Nom trop long.")}`);

    const patch: Partial<Omit<BucketConfig, "id" | "createdAt">> = { name: nextName };
    if (maxRaw) {
        const n = parseInt(maxRaw, 10);
        if (Number.isNaN(n) || n <= 0) {
            return redirect(`${ctx.prefix}/admin?error=${encodeURIComponent("maxFileSize invalide.")}`);
        }
        patch.maxFileSize = n;
    }
    if (mimeRaw) {
        patch.acceptedMimeTypes = mimeRaw === "*"
            ? "*"
            : mimeRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }

    await ctx.buckets.update(id, patch);
    return redirect(`${ctx.prefix}/admin/dashboard.html`);
}
