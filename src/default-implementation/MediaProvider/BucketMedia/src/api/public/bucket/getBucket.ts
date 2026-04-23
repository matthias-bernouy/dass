import type { ProviderContext } from "../../../interfaces/ProviderContext";
import type { MtMediaBucketInfo } from "../../../../types/types";
import { err } from "../../../core/utils";

/**
 * `GET /bucket?bucket=<id>` — returns the bucket's public info (no secret,
 * no dates). Used by `MtMediaConsumer.fromProvider` to self-configure its
 * `limits` field without holding the bucket secret.
 */
export async function getBucket(ctx: ProviderContext, req: Request): Promise<Response> {
    const bucketID = new URL(req.url).searchParams.get("bucket");
    if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });

    const bucket = await ctx.buckets.getById(bucketID);
    if (!bucket) return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });

    const info: MtMediaBucketInfo = {
        id:                bucket.id,
        name:              bucket.name,
        maxFileSize:       bucket.maxFileSize,
        acceptedMimeTypes: bucket.acceptedMimeTypes,
    };
    return Response.json({ ok: true, data: info });
}
