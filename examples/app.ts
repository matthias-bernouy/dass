/**
 * Demo complet : 1 Token Provider central + 2 instances CMS partageant les
 * mêmes tokens. Illustre :
 *   - La séparation Provider (storage + UI + introspect) / Consumer (pure
 *     verifier via /introspect).
 *   - Le SSO Keycloak qui fait que passer d'une instance à l'autre ne
 *     demande pas de re-saisir son mot de passe.
 *   - Un `CompositeAuthentication` sur chaque CMS qui agrège Keycloak
 *     (cookie) + TokenConsumer (bearer) derrière un seul handle.
 *
 * Topologie :
 *   Keycloak        http://localhost:8080  (via docker-compose)
 *   Token Provider  http://localhost:3000  (Keycloak cons + TokenProvider)
 *   CMS A           http://localhost:3001  (Keycloak cons + TokenConsumer + Composite)
 *   CMS B           http://localhost:3002  (idem CMS A)
 *
 * Setup Keycloak (admin console) :
 *   Realm "aelf1er", client "cms" confidentiel, Valid Redirect URIs :
 *     http://localhost:3000/auth/keycloak/callback
 *     http://localhost:3001/auth/keycloak/callback
 *     http://localhost:3002/auth/keycloak/callback
 *   + au moins un user avec le rôle `admin`.
 *
 * Scénarios de test :
 *   1. Aller sur http://localhost:3001 → "Login" → Keycloak → retour CMS A
 *   2. Cliquer "Gérer mes tokens" → redirect vers http://localhost:3000/tokens
 *      (SSO silencieux : pas de saisie) → créer un token → copier
 *   3. `curl -H "Authorization: Bearer be5_xxx" http://localhost:3002/protected`
 *      → marche aussi sur CMS B (même token introspecté)
 *   4. Revoke sur le Provider → dans les 30s, CMS A et B rejettent le token
 *
 * Run :
 *   bun examples/app.ts
 */
import { DefaultRunner } from "../src/Runner/DefaultRunner";
import { KeycloakConsumer } from "../src/Authentication/consumers/KeycloakConsumer";
import { TokenProvider } from "../src/Authentication/providers/TokenProvider/TokenProvider";
import { TokenConsumer } from "../src/Authentication/consumers/TokenConsumer";
import { CompositeAuthentication } from "../src/Authentication/CompositeAuthentication";
import { InMemoryApiTokenRepository } from "../src/Authentication/providers/TokenProvider/InMemoryApiTokenRepository";

const PROVIDER_PORT = 3000;
const CMS_A_PORT = 3001;
const CMS_B_PORT = 3002;

const PROVIDER_BASE_URL = `http://localhost:${PROVIDER_PORT}`;
const CMS_A_BASE_URL = `http://localhost:${CMS_A_PORT}`;
const CMS_B_BASE_URL = `http://localhost:${CMS_B_PORT}`;

const INTROSPECT_SECRET = process.env.INTROSPECT_SECRET ?? "dev-introspect-shared-secret";
const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/aelf1er";
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? "cms";
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET ?? "change-me";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-session-secret-please-override-in-prod";

// Partagé entre le Provider (stockage) et… personne d'autre, mais passer par
// une seule instance rend explicite le fait que c'est LE storage central.
const tokenRepository = new InMemoryApiTokenRepository();

function startProvider() {
    const runner = new DefaultRunner();

    const keycloak = new KeycloakConsumer(runner, {
        issuer: KEYCLOAK_ISSUER,
        clientId: KEYCLOAK_CLIENT_ID,
        clientSecret: KEYCLOAK_CLIENT_SECRET,
        appBaseUrl: PROVIDER_BASE_URL,
        basePath: "/auth/keycloak",
        sessionSecret: SESSION_SECRET,
        sessionTtlSeconds: 3600,
        defaultReturnTo: "/",
        // Cookies don't isolate by port on `localhost` per RFC 6265, so the
        // 3 instances MUST use distinct names to avoid sharing sessions in
        // this demo. In prod with real subdomains this isn't needed.
        cookieName: "be5-session-provider",
    });

    const tokens = new TokenProvider(runner, {
        inner: keycloak,
        repository: tokenRepository,
        basePath: "/tokens",
        maxTokensPerUser: 10,
        introspectSecret: INTROSPECT_SECRET,
    });

    // Un seul provider browser (Keycloak) → le Composite court-circuite la
    // page chooser et délègue direct à keycloak.loginUrl.
    const auth = new CompositeAuthentication(runner, {
        basePath: "/auth",
        children: [
            { auth: tokens },
            { auth: keycloak, displayName: "Keycloak" },
        ],
    });

    runner.get("/", async (req) => {
        const subject = await auth.getSubject(req);
        const who = subject ? `${subject.displayName ?? subject.identifier} (${subject.role})` : "anonymous";
        return htmlPage(`
            <h1>Token Provider <span class="port">:${PROVIDER_PORT}</span></h1>
            <p>Session : <strong>${escapeHtml(who)}</strong></p>
            <p class="actions">
                <a href="${auth.loginUrl}">Login</a> ·
                <a href="${auth.logoutUrl}">Logout</a> ·
                <a href="${tokens.profileUrl}">Mes API tokens</a>
            </p>
            <hr />
            <h2>CMS connectés</h2>
            <ul>
                <li><a href="${CMS_A_BASE_URL}">CMS A (port ${CMS_A_PORT})</a></li>
                <li><a href="${CMS_B_BASE_URL}">CMS B (port ${CMS_B_PORT})</a></li>
            </ul>`);
    });

    runner.start(PROVIDER_PORT);
    console.log(`📡 Token Provider : ${PROVIDER_BASE_URL}`);
}

function startCms(label: string, port: number, baseUrl: string, cookieName: string) {
    const runner = new DefaultRunner();

    const keycloak = new KeycloakConsumer(runner, {
        issuer: KEYCLOAK_ISSUER,
        clientId: KEYCLOAK_CLIENT_ID,
        clientSecret: KEYCLOAK_CLIENT_SECRET,
        appBaseUrl: baseUrl,
        basePath: "/auth/keycloak",
        sessionSecret: SESSION_SECRET,
        sessionTtlSeconds: 3600,
        defaultReturnTo: "/",
        cookieName,
    });

    const tokens = new TokenConsumer({
        introspectUrl: `${PROVIDER_BASE_URL}/tokens/introspect`,
        introspectSecret: INTROSPECT_SECRET,
        providerManagementUrl: `${PROVIDER_BASE_URL}/tokens`,
    });

    // Composite sur /auth : si on ajoute un 2ème browser provider (GitHub,
    // magic-link...), le chooser apparaîtra automatiquement sur /auth/login.
    const auth = new CompositeAuthentication(runner, {
        basePath: "/auth",
        children: [
            { auth: tokens },
            { auth: keycloak, displayName: "Se connecter avec Keycloak" },
        ],
    });

    runner.get("/", async (req) => {
        const subject = await auth.getSubject(req);
        const who = subject ? `${subject.displayName ?? subject.identifier} (${subject.role})` : "anonymous";
        return htmlPage(`
            <h1>${escapeHtml(label)} <span class="port">:${port}</span></h1>
            <p>Session : <strong>${escapeHtml(who)}</strong></p>
            <p class="actions">
                <a href="${auth.loginUrl}">Login</a> ·
                <a href="${auth.logoutUrl}">Logout</a> ·
                <a href="${tokens.profileUrl}">Gérer mes tokens</a>
                <small>(redirige vers le Provider)</small>
            </p>
            <hr />
            <h2>Tester le bearer</h2>
            <pre>curl -H "Authorization: Bearer be5_xxx" ${baseUrl}/protected</pre>
            <p class="muted">
                Un token créé depuis le Provider est valide sur <strong>toutes</strong> les
                instances CMS (même introspect, même DB centralisée).
            </p>`);
    });

    runner.get("/protected", async (req) => {
        const subject = await auth.getSubject(req);
        if (!subject) {
            const url = new URL(req.url);
            return new Response(null, {
                status: 302,
                headers: { Location: auth.buildLoginUrl(url.pathname + url.search) },
            });
        }
        return Response.json({ ok: true, side: label, subject });
    });

    runner.start(port);
    console.log(`🛰️  ${label.padEnd(6)} : ${baseUrl}`);
}

// ── minimal layout so les pages de demo soient pas moches ───────────────

function htmlPage(body: string): Response {
    return new Response(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Socle demo</title>
<style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { margin-bottom: 0.5rem; }
    h1 .port { color: #888; font-weight: normal; font-size: 1rem; }
    .actions a { margin-right: 0.5rem; }
    .muted { color: #666; font-size: 0.9rem; }
    hr { border: none; border-top: 1px solid #e5e5e5; margin: 1.5rem 0; }
    pre { background: #f7f7f7; padding: 0.75rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; }
    code { font-family: ui-monospace, monospace; }
</style>
</head>
<body>
${body}
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── boot ─────────────────────────────────────────────────────────────────

function main() {
    startProvider();
    startCms("CMS A", CMS_A_PORT, CMS_A_BASE_URL, "be5-session-cms-a");
    startCms("CMS B", CMS_B_PORT, CMS_B_BASE_URL, "be5-session-cms-b");

    console.log(``);
    console.log(`→ Ouvre ${CMS_A_BASE_URL} pour démarrer le flux.`);
    console.log(`→ INTROSPECT_SECRET="${INTROSPECT_SECRET}"`);
}

main();
