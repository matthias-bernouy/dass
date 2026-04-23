import type { ProviderContext } from "../../../interfaces/ProviderContext";
import { err, qualifyItem } from "../../../core/utils";

/**
 * `POST /file?bucket=<id>` (multipart/form-data, `file=<File>`) — upload a
 * new file. Token-gated: expects `Authorization: MtMedia <token>`.
 */
export async function uploadFile(ctx: ProviderContext, req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bucketID = url.searchParams.get("bucket");
    if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });

    const bucket = await ctx.buckets.getById(bucketID);
    if (!bucket) return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });

    const gate = ctx.requireToken(req, bucketID);
    if (gate) return Response.json(gate, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
        return Response.json(err("validation_error", "Missing file"), { status: 400 });
    }
    const folderID = form.get("folderID")?.toString() || undefined;
    const mimeTypeOverride = form.get("mimeType")?.toString() || undefined;
    const overwrite = form.get("overwrite") === "1";

    const result = await ctx.uploadFile(bucket, {
        data: file,
        name: file.name,
        mimeType: mimeTypeOverride ?? file.type,
        ...(folderID ? { folderID } : {}),
        overwrite,
    });
    if (result.ok) qualifyItem(result.data, req);
    return Response.json(result);
}
