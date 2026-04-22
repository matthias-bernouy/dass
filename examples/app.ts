/**
 * Demo wiring of the new Be5 auth contract with a Keycloak-backed consumer.
 *
 * Prereqs:
 *   1. `docker compose -f src/Keycloak/docker-compose.yml up -d` (Keycloak + Postgres + Mailhog).
 *   2. In Keycloak admin console (http://localhost:8080), create a realm
 *      "aelf1er", a confidential client "cms" with:
 *         - Valid redirect URIs:           http://localhost:3000/auth/callback
 *         - Valid post-logout redirect URIs: http://localhost:3000/auth/post-logout-callback
 *      plus at least one user with the `admin` realm role.
 *   3. Copy the client secret into SESSION_SECRET below or an env var.
 *
 * Run:
 *   bun examples/app.ts
 */
import { DefaultRunner } from "../src/Runner/DefaultRunner";
import { KeycloakAuthenticationConsumer } from "../src/Authentication/consumers/KeycloakAuthenticationConsumer";

const PORT = 3000;
const APP_BASE_URL = `http://localhost:${PORT}`;

async function main() {
    const runner = new DefaultRunner();

    const auth = new KeycloakAuthenticationConsumer(runner, {
        issuer: process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/aelf1er",
        clientId: process.env.KEYCLOAK_CLIENT_ID ?? "cms",
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? "change-me",
        appBaseUrl: APP_BASE_URL,
        basePath: "/auth",
        sessionSecret: process.env.SESSION_SECRET ?? "dev-only-session-secret-please-override-in-prod",
        sessionTtlSeconds: 3600,
        defaultReturnTo: "/",
    });

    runner.get("/", async (req) => {
        const subject = await auth.getSubject(req);
        const who = subject ? `${subject.displayName ?? subject.identifier} (${subject.role})` : "anonymous";
        return new Response(
            `<h1>Be5 demo app</h1>
             <p>Session: ${who}</p>
             <p>
               <a href="/protected">Protected</a> ·
               <a href="${auth.loginUrl}">Login</a> ·
               <a href="${auth.logoutUrl}">Logout</a> ·
               <a href="${auth.profileUrl}">Keycloak profile</a>
             </p>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
    });

    runner.get("/protected", async (req) => {
        const subject = await auth.getSubject(req);
        console.log(subject)
        if (!subject) {
            const returnTo = new URL(req.url).pathname + new URL(req.url).search;
            return new Response(null, { status: 302, headers: { Location: auth.buildLoginUrl(returnTo) } });
        }
        return Response.json({ ok: true, subject });
    });

    runner.start(PORT);
    console.log(`Demo app on ${APP_BASE_URL}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
