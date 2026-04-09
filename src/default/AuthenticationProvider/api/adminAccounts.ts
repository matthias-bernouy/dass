import type { Authentication } from "../Authentication";

export async function adminListAccounts(_req: Request, system: Authentication): Promise<Response> {
    try {
        const accounts = await system.listAccounts();
        return new Response(JSON.stringify(accounts), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("List accounts error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

export async function adminCreateAccount(req: Request, system: Authentication): Promise<Response> {
    try {
        const { identifier, password, role } = await req.json() as {
            identifier?: string;
            password?: string;
            role?: 'admin' | 'user';
        };
        if (!identifier || !password || (role !== 'admin' && role !== 'user')) {
            return new Response("identifier, password and role (admin|user) are required", { status: 400 });
        }
        const created = await system.createAccount(identifier, password, role);
        return new Response(
            JSON.stringify({ message: "Account created", account: created }),
            { status: 201, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Create account error:", error);
        const message = error instanceof Error ? error.message : "Failed to create account";
        return new Response(message, { status: 400 });
    }
}

export async function adminDeleteAccount(req: Request, system: Authentication): Promise<Response> {
    try {
        // The requireAdmin middleware already validated the caller.
        const current = await system.getSubject(req);
        if (!current) return new Response("Unauthorized", { status: 401 });

        const { identifier } = await req.json() as { identifier?: string };
        if (!identifier) {
            return new Response("identifier is required", { status: 400 });
        }

        if (current.identifier === identifier) {
            return new Response("You cannot delete your own account", { status: 400 });
        }

        await system.deleteAccount(identifier);
        return new Response(
            JSON.stringify({ message: "Account deleted" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Delete account error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete account";
        return new Response(message, { status: 400 });
    }
}

export async function adminUpdateRole(req: Request, system: Authentication): Promise<Response> {
    try {
        const current = await system.getSubject(req);
        if (!current) return new Response("Unauthorized", { status: 401 });

        const { identifier, role } = await req.json() as { identifier?: string; role?: 'admin' | 'user' };
        if (!identifier || (role !== 'admin' && role !== 'user')) {
            return new Response("identifier and role (admin|user) are required", { status: 400 });
        }

        if (current.identifier === identifier && role !== 'admin') {
            return new Response("You cannot demote your own account", { status: 400 });
        }

        await system.setAccountRole(identifier, role);
        return new Response(
            JSON.stringify({ message: "Role updated" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Update role error:", error);
        const message = error instanceof Error ? error.message : "Failed to update role";
        return new Response(message, { status: 400 });
    }
}
