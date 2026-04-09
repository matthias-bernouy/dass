import type { Authentication } from "../Authentication";

export async function resetSubmit(req: Request, system: Authentication): Promise<Response> {
    try {
        const { token, password } = await req.json() as { token?: string; password?: string };

        if (!token || !password) {
            return new Response("Token and password are required", { status: 400 });
        }

        await system.resetPassword(token, password);

        return new Response(
            JSON.stringify({ message: "Password updated successfully" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Reset password error:", error);
        const message = error instanceof Error ? error.message : "Invalid or expired token";
        return new Response(message, { status: 400 });
    }
}
