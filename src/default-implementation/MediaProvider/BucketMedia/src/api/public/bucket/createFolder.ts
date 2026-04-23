import type { MediaCreateFolderOptions } from "../../../../../../../interfaces/Media";
import type { ProviderContext } from "../../../interfaces/ProviderContext";
import { err } from "../../../core/utils";

/**
 * `POST /folder?bucket=<id>` (JSON body: `{ name, parentFolderID? }`) —
 * create a folder. Token-gated.
 */
export async function createFolder(ctx: ProviderContext, req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bucketID = url.searchParams.get("bucket");
    if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
    if (!(await ctx.buckets.getById(bucketID))) {
        return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });
    }

    const gate = ctx.requireToken(req, bucketID);
    if (gate) return Response.json(gate, { status: 401 });

    const body = await req.json() as MediaCreateFolderOptions;
    if (!body?.name) return Response.json(err("invalid_name", "Name is required"), { status: 400 });
    return Response.json(await ctx.createFolder(bucketID, body));
}
