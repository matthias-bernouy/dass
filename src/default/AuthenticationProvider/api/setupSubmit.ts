import { hash } from "bcryptjs";
import type { Authentication } from "../Authentication";

/**
 * Creates the very first admin account.
 * 409 if any account already exists — this endpoint is meant to run exactly once.
 */
export async function setupSubmit(req: Request, system: Authentication): Promise<Response> {
    try {
        const count = await system.repository.count();
        if (count > 0) {
            return new Response("Setup already completed", { status: 409 });
        }

        const { email, password } = await req.json() as { email?: string; password?: string };
        if (!email || !password) {
            return new Response("Email and password are required", { status: 400 });
        }

        const passwordHash = await hash(password, 10);
        await system.repository.register({
            email,
            passwordHash,
            role: 'admin',
        });

        return new Response(
            JSON.stringify({ message: "Admin account created" }),
            { status: 201, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Setup error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
