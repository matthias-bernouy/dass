/**
 * Demo wiring of the Be5 auth stack.
 *
 * Run with:
 *   JWT_SECRET=dev-secret bun examples/app.ts
 *
 * Requires a running MongoDB on localhost:27017 (or set MONGO_URI).
 */
import { DefaultRunner } from "../src/Runner/DefaultRunner";
import { DefaultAuthentication } from "../src/Authentication/DefaultAuthentication";
import { DefaultAuthRepository } from "../src/Authentication/DefaultAuthRepository";
import { DefaultConsoleMailer } from "../src/Mailer/DefaultConsoleMailer";
// import { DefaultSmtpMailer } from "../src/Mailer/DefaultSmtpMailer";

async function main() {
    const runner = new DefaultRunner();

    const repository = await DefaultAuthRepository.create({
        uri: process.env.MONGO_URI ?? "mongodb://localhost:27017",
        databaseName: "nbu-auth-demo",
    });

    const mailer = new DefaultConsoleMailer("no-reply@be5.local");

    const auth = new DefaultAuthentication(repository, runner, {
        basePath: "/auth",
        baseUrl: "http://localhost:3000",
        defaultRedirection: "/dashboard",
        mailer,
        mailFrom: "no-reply@be5.local",
        resetTokenTtlMinutes: 30,
    });

    runner.get("/", () => new Response("👋 Be5 demo. Try /auth/login, /auth/setup, /dashboard"));

    runner.get("/dashboard", async (req) => {
        const subject = await auth.getSubject(req);
        return new Response(
            `Hello ${subject?.identifier} (${subject?.role}). ` +
            `Admin panel: ${auth.adminAccountsPage} — Logout: ${auth.logoutPage}`,
            { headers: { "Content-Type": "text/plain" } }
        );
    }, [auth.requireAuthenticated]);

    runner.get("/secret-stats", async () => {
        const accounts = await auth.listAccounts();
        return Response.json({ total: accounts.length, accounts });
    }, [auth.requireAdmin]);

    runner.get("/private", async (req) => {
        if (!(await auth.isAuthenticated(req))) {
            return Response.redirect(auth.withRedirect(auth.loginPage, "/private"), 302);
        }
        return new Response("Private area");
    });

    runner.start();
}

main().catch(err => {
    console.error("Failed to start demo:", err);
    process.exit(1);
});
