import { hash } from "bcryptjs";
import type { Authentication } from "../Authentication";

export async function registerSubmit(req: Request, system: Authentication) {
    try {
        const count = await system.repository.count();

        if (system.registerDisabled && count > 0) {
            return new Response(Bun.file("./pages/disabled.page.html"));
        }

        const { email, password } = await req.json() as any;

        if (!email || !password) {
            return new Response("Email and password are required", { status: 400 });
        }



        const existing = await system.repository.findByEmail(email)
        if (existing) {
            return new Response("User already exists", { status: 409 });
        }

        const passwordHash = await hash(password, 10);

        system.repository.register({
            email,
            passwordHash: passwordHash,
            role: count == 0 ? 'admin' : 'user'
        })

        return new Response(JSON.stringify({ message: "User registered successfully" }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Registration error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}