import type { Authentication } from "../Authentication";

export async function changePasswordSubmit(req: Request, system: Authentication): Promise<Response> {
    try {
        const { currentPassword, newPassword } = await req.json() as {
            currentPassword?: string;
            newPassword?: string;
        };

        if (!currentPassword || !newPassword) {
            return new Response("currentPassword and newPassword are required", { status: 400 });
        }

        await system.changePassword(req, currentPassword, newPassword);

        return new Response(
            JSON.stringify({ message: "Password updated successfully" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Change password error:", error);
        const message = error instanceof Error ? error.message : "Failed to change password";
        return new Response(message, { status: 400 });
    }
}
