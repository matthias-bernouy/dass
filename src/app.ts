/**
 * Demo wiring of the Be5 auth stack.
 *
 * Run with:
 *   JWT_SECRET=dev-secret bun src/app.ts
 *
 * Requires a running MongoDB on localhost:27017 (or set MONGO_URI).
 */
import { Be5_Runner } from "./default/RunnerProvider";
import { Authentication } from "./default/AuthenticationProvider/Authentication";
import { AuthRepositoryProvider } from "./default/AuthenticationProvider/interfaces/default-provider/AuthRepositoryProvider";
import { ConsoleMailerProvider } from "./default/MailerProvider/ConsoleMailerProvider";
// import { SmtpMailerProvider } from "./default/MailerProvider/SmtpMailerProvider";

async function main() {
    // 1. HTTP runner ─────────────────────────────────────────────────────
    const runner = new Be5_Runner();

    // 2. Repository (MongoDB) ────────────────────────────────────────────
    const repository = await AuthRepositoryProvider.create({
        uri: process.env.MONGO_URI ?? "mongodb://localhost:27017",
        databaseName: "azerazeazerazer",
    });

    // 3. Mailer — console for dev, SMTP in prod ──────────────────────────
    const mailer = new ConsoleMailerProvider("no-reply@be5.local");
    // const mailer = new SmtpMailerProvider({
    //     host: "smtp.example.com",
    //     port: 587,
    //     auth: { user: "xxx", pass: "yyy" },
    //     defaultFrom: "no-reply@example.com",
    // });

    // 4. Authentication — mailer is optional; omit it to disable reset ──
    const auth = new Authentication(repository, runner, {
        basePath: "/auth",
        baseUrl: "http://localhost:3000",
        defaultRedirection: "/dashboard",
        mailer,
        mailFrom: "no-reply@be5.local",
        resetTokenTtlMinutes: 30,
    });

    // 5. Public route ────────────────────────────────────────────────────
    runner.get("/", () => new Response("👋 Be5 demo. Try /auth/login, /auth/setup, /dashboard"));

    // 6. Protected route — any authenticated user ────────────────────────
    runner.get("/dashboard", async (req) => {
        const subject = await auth.getSubject(req);
        return new Response(
            `Hello ${subject?.identifier} (${subject?.role}). ` +
            `Admin panel: ${auth.adminAccountsPage} — Logout: ${auth.logoutPage}`,
            { headers: { "Content-Type": "text/plain" } }
        );
    }, [auth.requireAuthenticated]);

    // 7. Admin-only route using the exposed middleware ──────────────────
    runner.get("/secret-stats", async () => {
        const accounts = await auth.listAccounts();
        return Response.json({ total: accounts.length, accounts });
    }, [auth.requireAdmin]);

    // 8. Helper: redirect unauthenticated traffic back to login ─────────
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
