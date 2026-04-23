import type { ProviderContext } from "../../interfaces/ProviderContext";

/**
 * `GET {prefix}/admin/api/session` — admin-gated JSON about the current
 * operator (display name, role, logoutUrl). Used by the admin dashboard
 * header to render "Connecté en tant que …".
 */
export async function session(ctx: ProviderContext, req: Request): Promise<Response> {
    const gate = await ctx.requireAdmin(req);
    if (gate instanceof Response) return gate;
    return Response.json({
        ok: true,
        data: {
            identifier:  gate.identifier,
            displayName: gate.displayName ?? null,
            role:        gate.role,
            logoutUrl:   ctx.admin.logoutUrl,
        },
    });
}
