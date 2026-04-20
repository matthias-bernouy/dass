import { compare } from "bcryptjs";
import type { DefaultAuthentication } from "../DefaultAuthentication";

export async function loginSubmit(req: Request, system: DefaultAuthentication): Promise<Response> {
    try {
        const { email, password } = await req.json() as { email?: string; password?: string };
        if (!email || !password) {
            return new Response("Invalid credentials", { status: 401 });
        }

        const user = await system.repository.findByEmail(email);
        if (!user || !(await compare(password, user.passwordHash))) {
            return new Response("Invalid credentials", { status: 401 });
        }

        const cookie = await system.issueSessionCookie({
            email: user.email,
            role: user.role,
            id: user.id,
        });

        return new Response(JSON.stringify({ message: "Login success" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": cookie,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
