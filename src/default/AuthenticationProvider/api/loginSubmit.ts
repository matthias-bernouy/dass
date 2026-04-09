import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import type { Authentication } from "../Authentication";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function loginSubmit(req: Request, system: Authentication) {
    try {
        const { email, password } = await req.json() as any;

        // 1. Recherche utilisateur
        const user = await system.repository.findByEmail(email);
        if (!user || !(await compare(password, user.passwordHash))) {
            return new Response("Invalid credentials", { status: 401 });
        }

        // 2. Création du JWT
        const jwt = await new SignJWT({ email: user.email, sub: user.id, role: user.role })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(JWT_SECRET);
            
        const cookie = `Be5Credentials=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7200`;

        return new Response(JSON.stringify({ message: "Login success" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": cookie
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}