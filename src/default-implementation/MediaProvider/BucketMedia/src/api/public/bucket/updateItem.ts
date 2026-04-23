import type { MediaUpdateItemOptions } from "../../../../../../../interfaces/Media";
import type { ProviderContext } from "../../../interfaces/ProviderContext";
import { err, qualifyItem } from "../../../core/utils";

/**
 * `PATCH /item?bucket=<id>&id=<itemID>` (JSON body: `{ name?, parentFolderID? }`)
 * — rename and/or move an item. Token-gated.
 */
export async function updateItem(ctx: ProviderContext, req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bucketID = url.searchParams.get("bucket");
    const id = url.searchParams.get("id");
    if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
    if (!id)       return Response.json(err("validation_error", "Missing id"),     { status: 400 });

    const gate = ctx.requireToken(req, bucketID);
    if (gate) return Response.json(gate, { status: 401 });

    const body = await req.json() as Omit<MediaUpdateItemOptions, "id">;
    const result = await ctx.updateItem(bucketID, { id, ...body });
    if (result.ok) qualifyItem(result.data, req);
    return Response.json(result);
}
