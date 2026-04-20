import type { DefaultAuthentication } from "../DefaultAuthentication";

export async function listMyTokens(req: Request, system: DefaultAuthentication): Promise<Response> {
    try {
        const subject = await system.getSubject(req);
        if (!subject) return new Response("Unauthorized", { status: 401 });
        const tokens = await system.listTokens(subject.identifier);
        return new Response(JSON.stringify(tokens), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("List tokens error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

export async function createMyToken(req: Request, system: DefaultAuthentication): Promise<Response> {
    try {
        const subject = await system.getSubject(req);
        if (!subject) return new Response("Unauthorized", { status: 401 });

        const { name, expiresInMinutes } = await req.json() as {
            name?: string;
            expiresInMinutes?: number;
        };
        if (typeof expiresInMinutes !== "number" || !Number.isFinite(expiresInMinutes) || expiresInMinutes <= 0) {
            return new Response("expiresInMinutes must be a positive number", { status: 400 });
        }

        const result = await system.createToken(subject.identifier, {
            expiresInMinutes,
            name: name?.trim() || undefined,
        });
        return new Response(JSON.stringify(result), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Create token error:", error);
        const message = error instanceof Error ? error.message : "Failed to create token";
        return new Response(message, { status: 400 });
    }
}

export async function deleteMyToken(req: Request, system: DefaultAuthentication): Promise<Response> {
    try {
        const subject = await system.getSubject(req);
        if (!subject) return new Response("Unauthorized", { status: 401 });

        const { id } = await req.json() as { id?: string };
        if (!id) return new Response("id is required", { status: 400 });

        // Ownership check: only let the caller revoke tokens they own.
        const tokens = await system.listTokens(subject.identifier);
        if (!tokens.some(t => t.id === id)) {
            return new Response("Token not found", { status: 404 });
        }

        await system.deleteToken(id);
        return new Response(
            JSON.stringify({ message: "Token revoked" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Delete token error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete token";
        return new Response(message, { status: 400 });
    }
}
