import type { ProviderContext } from "../../../interfaces/ProviderContext";

/**
 * `GET /file?bucket=<id>&id=<itemID>[&w=…&h=…&fit=…&fmt=…&q=…]` — streams
 * the raw bytes, optionally transformed for images. Public: no auth, no
 * signature. Designed to be used directly in `<img src>`.
 */
export async function getFile(ctx: ProviderContext, req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bucketID = url.searchParams.get("bucket");
    const id = url.searchParams.get("id");
    if (!bucketID || !id) return new Response("Missing bucket or id", { status: 400 });
    return ctx.serveFileBytes(bucketID, id, url);
}
