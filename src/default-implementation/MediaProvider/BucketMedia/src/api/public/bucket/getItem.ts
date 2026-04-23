import type { ProviderContext } from "../../../interfaces/ProviderContext";
import { err, qualifyItem } from "../../../core/utils";

/** `GET /item?bucket=<id>&id=<itemID>` — metadata for a single item. */
export async function getItem(ctx: ProviderContext, req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bucketID = url.searchParams.get("bucket");
    const id = url.searchParams.get("id");
    if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
    if (!id)       return Response.json(err("validation_error", "Missing id"),     { status: 400 });

    const result = await ctx.getItem(bucketID, id);
    if (result.ok) qualifyItem(result.data, req);
    return Response.json(result);
}
