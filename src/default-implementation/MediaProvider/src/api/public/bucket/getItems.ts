import type { MediaGetItemsOptions, MediaItemType } from "../../../../../../interfaces/Media";
import type { ProviderContext } from "../../../interfaces/ProviderContext";
import { err, qualifyItem } from "../../../core/utils";

/** `GET /items?bucket=<id>&…` — paginated + filterable list of media items. */
export async function getItems(ctx: ProviderContext, req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bucketID = url.searchParams.get("bucket");
    if (!bucketID) return Response.json(err("validation_error", "Missing bucket"), { status: 400 });
    if (!(await ctx.buckets.getById(bucketID))) {
        return Response.json(err("not_found", `No bucket with id "${bucketID}"`), { status: 404 });
    }

    const accept = url.searchParams.get("accept");
    const result = await ctx.getItems(bucketID, {
        folderID:  url.searchParams.get("folderID") ?? undefined,
        accept:    accept ? (accept.split(",") as MediaItemType[]) : undefined,
        search:    url.searchParams.get("search") ?? undefined,
        sortBy:    (url.searchParams.get("sortBy")    as MediaGetItemsOptions["sortBy"])    ?? undefined,
        sortOrder: (url.searchParams.get("sortOrder") as MediaGetItemsOptions["sortOrder"]) ?? undefined,
        pagination: {
            page:  parseInt(url.searchParams.get("page")  ?? "1",   10),
            limit: parseInt(url.searchParams.get("limit") ?? "100", 10),
        },
    });
    if (result.ok) result.data.items.forEach((i) => qualifyItem(i, req));
    return Response.json(result);
}
