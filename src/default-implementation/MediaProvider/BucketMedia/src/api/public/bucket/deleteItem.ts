import type { ProviderContext } from "../../../interfaces/ProviderContext";
import { err } from "../../../core/utils";

/**
 * `DELETE /item?bucket=<id>&id=<itemID>[&recursive=1]` — delete an item.
 * Token-gated. Folders need `recursive=1` to delete non-empty trees.
 */
export async function deleteItem(ctx: ProviderContext, req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bucketID = url.searchParams.get("bucket");
    const id = url.searchParams.get("id");
    if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
    if (!id)       return Response.json(err("validation_error", "Missing id"),     { status: 400 });

    const gate = ctx.requireToken(req, bucketID);
    if (gate) return Response.json(gate, { status: 401 });

    const recursive = url.searchParams.get("recursive") === "true" || url.searchParams.get("recursive") === "1";
    return Response.json(await ctx.deleteItem(bucketID, { id, recursive }));
}
