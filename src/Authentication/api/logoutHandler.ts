import type { DefaultAuthentication } from "../DefaultAuthentication";

export function logoutHandler(_req: Request, system: DefaultAuthentication): Response {
    return new Response(null, {
        status: 302,
        headers: {
            "Set-Cookie": system.clearSessionCookie(),
            "Location": system.loginPage,
        },
    });
}
