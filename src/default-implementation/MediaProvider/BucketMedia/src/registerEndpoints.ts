import { join } from "node:path";

import { buildUIComponents } from "../../../../ui/buildUIComponents";
import cssSource from "src/ui/default.css" with { type: "text" };
import { registerStaticFolder } from "../../../RunnerProvider/registerStaticFolder";
import type { RouteHandler, Runner } from "../../../../interfaces/Runner";
import { redirect } from "../../../../utilities/html";
import type { ProviderContext } from "./interfaces/ProviderContext";

import { getBucket }    from "./api/public/bucket/getBucket";
import { getItems }     from "./api/public/bucket/getItems";
import { getItem }      from "./api/public/bucket/getItem";
import { getFile }      from "./api/public/bucket/getFile";
import { uploadFile }   from "./api/public/bucket/uploadFile";
import { createFolder } from "./api/public/bucket/createFolder";
import { updateItem }   from "./api/public/bucket/updateItem";
import { deleteItem }   from "./api/public/bucket/deleteItem";
import { mint }         from "./api/public/token/mint";
import { preflight }    from "./api/preflight";

import { listBuckets }  from "./api/admin/listBuckets";
import { session }      from "./api/admin/session";
import { createBucket } from "./api/admin/createBucket";
import { updateBucket } from "./api/admin/updateBucket";
import { rotateSecret } from "./api/admin/rotateSecret";
import { deleteBucket } from "./api/admin/deleteBucket";

/**
 * Lazily-built browser bundle, cached process-wide. The entry
 * (`./components/build.ts`) is the same file for every `MtMediaProvider`
 * instance so we can safely share a single promise.
 */
let _clientBundlePromise: Promise<string> | null = null;
function getClientBundle(): Promise<string> {
    if (!_clientBundlePromise) {
        _clientBundlePromise = buildUIComponents(join(import.meta.dir, "./components/build.ts"));
    }
    return _clientBundlePromise;
}

/**
 * Wires every route the provider exposes onto `runner`. Split out of the
 * class so `MtMediaProvider` itself stays focused on state + business
 * operations, and so each route can be read in isolation (one file per
 * handler under `api/`).
 *
 * Route map (relative to the group's prefix):
 *
 *   Static pages (from `./static/`):
 *     GET /forbidden.html
 *     GET /admin/dashboard.html
 *     GET /bucket/dashboard.html
 *     GET /bucket/config.html
 *     GET /bucket/limitation.html
 *
 *   Shortcuts:
 *     GET /admin                         → 302 redirect to /admin/dashboard.html
 *
 *   Assets (provider-owned):
 *     GET /assets/w13c.js                → bundled web components
 *     GET /assets/style.css              → src/ui/default.css
 *
 *   Public API (CORS-allowed):
 *     GET    /bucket?bucket=…
 *     GET    /items?bucket=…
 *     GET    /item?bucket=…&id=…
 *     GET    /file?bucket=…&id=…
 *     POST   /file?bucket=…              (token-gated)
 *     POST   /folder?bucket=…            (token-gated)
 *     PATCH  /item?bucket=…&id=…         (token-gated)
 *     DELETE /item?bucket=…&id=…         (token-gated)
 *     POST   /mint?bucket=…              (bucket secret)
 *     OPTIONS *                          (CORS preflight)
 *
 *   Admin JSON (admin-gated):
 *     GET  /admin/api/buckets            → list
 *     GET  /admin/api/session            → current operator
 *
 *   Admin mutations (admin-gated):
 *     POST /admin/buckets                → create
 *     POST /admin/buckets/update?id=…
 *     POST /admin/buckets/rotate?id=…
 *     POST /admin/buckets/delete?id=…
 */
export default function registerEndpoints(sys: ProviderContext, runner: Runner): void {
    const cors = (h: RouteHandler): RouteHandler => withCors(sys, h);

    // Static pages — served as-is from the `static/` folder. URLs in those
    // HTML files are all relative, so there's no templating to do.
    registerStaticFolder(join(import.meta.dir, "./static"), runner);

    // Convenience: /admin lands on the dashboard page.
    runner.get("/admin", () => redirect("./admin/dashboard.html"));

    // Assets — the provider owns its own browser bundle + theme.
    runner.get("/assets/w13c.js", async () => {
        try {
            const js = await getClientBundle();
            return new Response(js, {
                headers: {
                    "Content-Type":  "application/javascript; charset=utf-8",
                    "Cache-Control": "public, max-age=60",
                },
            });
        } catch (e) {
            console.error("[MtMediaProvider] client bundle failed:", e);
            return new Response("// client bundle failed", { status: 500 });
        }
    });
    runner.get("/assets/style.css", () => new Response(cssSource as unknown as string, {
        headers: {
            "Content-Type":  "text/css; charset=utf-8",
            "Cache-Control": "public, max-age=60",
        },
    }));

    // Public API
    runner.get   ("/bucket", cors((req) => getBucket(sys, req)));
    runner.get   ("/items",  cors((req) => getItems(sys, req)));
    runner.get   ("/item",   cors((req) => getItem(sys, req)));
    runner.get   ("/file",   cors((req) => getFile(sys, req)));
    runner.post  ("/file",   cors((req) => uploadFile(sys, req)));
    runner.post  ("/folder", cors((req) => createFolder(sys, req)));
    runner.patch ("/item",   cors((req) => updateItem(sys, req)));
    runner.delete("/item",   cors((req) => deleteItem(sys, req)));
    runner.post  ("/mint",   cors((req) => mint(sys, req)));

    // CORS preflight
    runner.setDefaultEndpoint("OPTIONS", (req) => preflight(sys, req));

    // Admin JSON
    runner.get  ("/admin/api/buckets",    cors((req) => listBuckets(sys, req)));
    runner.get  ("/admin/api/session",    cors((req) => session(sys, req)));

    // Admin mutations
    runner.post ("/admin/buckets",        cors((req) => createBucket(sys, req)));
    runner.post ("/admin/buckets/update", cors((req) => updateBucket(sys, req)));
    runner.post ("/admin/buckets/rotate", cors((req) => rotateSecret(sys, req)));
    runner.post ("/admin/buckets/delete", cors((req) => deleteBucket(sys, req)));
}

/**
 * Wraps a handler so its response carries the right `Access-Control-*`
 * headers when the request came from an allow-listed origin. Inlined here
 * rather than on the provider to keep the CORS plumbing colocated with
 * route registration.
 */
function withCors(sys: ProviderContext, handler: RouteHandler): RouteHandler {
    return async (req) => {
        const res = await handler(req);
        const allow = sys.resolveAllowedOrigin(req.headers.get("origin"));
        if (!allow) return res;
        res.headers.set("Access-Control-Allow-Origin", allow);
        res.headers.append("Vary", "Origin");
        return res;
    };
}
