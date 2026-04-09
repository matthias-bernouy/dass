import type { Authentication } from "../Authentication";

export function logoutHandler(_req: Request, system: Authentication): Response {
    // Clear the auth cookie by issuing an expired one with the same attributes.
    const cookie = `Be5Credentials=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
    return new Response(null, {
        status: 302,
        headers: {
            "Set-Cookie": cookie,
            "Location": system.loginPage,
        },
    });
}
