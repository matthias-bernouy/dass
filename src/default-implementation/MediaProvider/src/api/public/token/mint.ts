import type { ProviderContext } from "../../../interfaces/ProviderContext";
import type { MtMediaMintResponse } from "../../../../types/types";
import { constantTimeEquals } from "../../../core/utils";
import { randomBase64Url, sha256Hex } from "../../../../../../utilities/crypto";

/**
 * `POST /mint?bucket=<id>` — consumer-app broker → one-time mutation token.
 *
 * The caller proves ownership of the bucket by passing its shared secret in
 * the `X-Bucket-Secret` header (constant-time compared against the stored
 * SHA-256). The returned token is good for exactly one mutation call and
 * expires after `ctx.tokenTtlMs`.
 */
export async function mint(ctx: ProviderContext, req: Request): Promise<Response> {
    const bucketID = new URL(req.url).searchParams.get("bucket");
    if (!bucketID) return Response.json({ error: "missing_bucket" }, { status: 400 });

    const bucket = await ctx.buckets.getById(bucketID);
    if (!bucket) return Response.json({ error: "bucket_not_found" }, { status: 404 });

    const provided = req.headers.get("x-bucket-secret") ?? req.headers.get("X-Bucket-Secret");
    if (!provided) return Response.json({ error: "missing_secret" }, { status: 401 });

    const hash = await sha256Hex(provided);
    if (!constantTimeEquals(hash, bucket.secretHash)) {
        return Response.json({ error: "invalid_secret" }, { status: 401 });
    }

    const token = randomBase64Url(24);
    const expiresAt = Date.now() + ctx.tokenTtlMs;
    ctx.rememberToken(token, bucketID, expiresAt);
    const body: MtMediaMintResponse = { token, expiresAt };
    return Response.json(body);
}
