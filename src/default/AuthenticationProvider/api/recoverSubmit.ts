import type { Authentication } from "../Authentication";

export async function recoverSubmit(req: Request, system: Authentication): Promise<Response> {
    try {
        if (!system.mailEnabled) {
            return new Response("Password recovery is disabled on this server", { status: 503 });
        }

        const { email } = await req.json() as { email?: string };
        if (!email) {
            return new Response("Email is required", { status: 400 });
        }

        // Always respond with 200 to prevent account enumeration.
        await system.requestPasswordReset(email);

        return new Response(
            JSON.stringify({ message: "If an account exists for this email, a reset link has been sent." }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Password recovery error:", error);
        // Still respond 200 to avoid leaking information.
        return new Response(
            JSON.stringify({ message: "If an account exists for this email, a reset link has been sent." }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }
}
