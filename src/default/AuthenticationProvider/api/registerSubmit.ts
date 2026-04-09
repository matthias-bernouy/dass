import { hash } from "bcryptjs";
import type { Authentication } from "../Authentication";
import { signAuthJwt } from "../Authentication";

export async function registerSubmit(req: Request, system: Authentication): Promise<Response> {
    try {
        const count = await system.repository.count();

        // Defense-in-depth: the GET /register handler already redirects to /setup
        // when count === 0 and blocks the form when registerDisabled is on,
        // but a direct POST to /registerSubmit must enforce the same rules.
        if (count === 0) {
            return new Response("Use /auth/setup to create the first account", { status: 409 });
        }
        if (system.registerDisabled) {
            return new Response("Registration is disabled", { status: 403 });
        }

        const { email, password } = await req.json() as { email?: string; password?: string };
        if (!email || !password) {
            return new Response("Email and password are required", { status: 400 });
        }

        const existing = await system.repository.findByEmail(email);
        if (existing) {
            return new Response("User already exists", { status: 409 });
        }

        const passwordHash = await hash(password, 10);
        const subject = await system.repository.register({
            email,
            passwordHash,
            role: 'user',
        });

        // Auto-login: sign a JWT and set the cookie so the client lands on
        // the dashboard as the freshly-created user instead of whoever was
        // logged in before.
        const jwt = await signAuthJwt({
            email: subject.email,
            sub: subject.id ?? subject.email,
            role: subject.role,
        });
        const cookie = `Be5Credentials=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7200`;

        return new Response(
            JSON.stringify({ message: "User registered successfully" }),
            {
                status: 201,
                headers: {
                    "Content-Type": "application/json",
                    "Set-Cookie": cookie,
                },
            }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
