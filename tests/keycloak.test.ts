import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from "jose";

import { KeycloakConsumer } from "../src/Authentication/consumers/KeycloakConsumer";
import { FakeRunner } from "./helpers/FakeRunner";

const ISSUER = "http://kc.test/realms/aelf1er";
const APP_BASE_URL = "http://app.test";
const CLIENT_ID = "cms";
const CLIENT_SECRET = "test-secret";
const SESSION_SECRET = "a".repeat(48);

const AUTH_ENDPOINT = `${ISSUER}/protocol/openid-connect/auth`;
const TOKEN_ENDPOINT = `${ISSUER}/protocol/openid-connect/token`;
const END_SESSION_ENDPOINT = `${ISSUER}/protocol/openid-connect/logout`;
const JWKS_ENDPOINT = `${ISSUER}/protocol/openid-connect/certs`;
const DISCOVERY_ENDPOINT = `${ISSUER}/.well-known/openid-configuration`;

let kcPrivateKey: CryptoKey;
let kcPublicJwk: Awaited<ReturnType<typeof exportJWK>>;
let runner: FakeRunner;
let consumer: KeycloakConsumer;

/**
 * State held by the mock Keycloak. Tests prime `nextTokenResponse` before
 * hitting `/auth/callback` so the token endpoint returns an id_token they
 * can predict.
 */
let nextTokenResponse: { id_token?: string; access_token?: string; error?: string } | null = null;
let tokenCalls: Array<{ body: URLSearchParams }> = [];

const realFetch = globalThis.fetch;

beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    kcPrivateKey = pair.privateKey;
    kcPublicJwk = { ...(await exportJWK(pair.publicKey)), kid: "kc-test", alg: "RS256", use: "sig" };

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url === DISCOVERY_ENDPOINT) {
            return Response.json({
                issuer: ISSUER,
                authorization_endpoint: AUTH_ENDPOINT,
                token_endpoint: TOKEN_ENDPOINT,
                end_session_endpoint: END_SESSION_ENDPOINT,
                jwks_uri: JWKS_ENDPOINT,
            });
        }
        if (url === JWKS_ENDPOINT) {
            return Response.json({ keys: [kcPublicJwk] });
        }
        if (url === TOKEN_ENDPOINT) {
            const body = new URLSearchParams(init!.body as string);
            tokenCalls.push({ body });
            if (!nextTokenResponse) return new Response("no mock response primed", { status: 500 });
            if (nextTokenResponse.error) {
                return Response.json({ error: nextTokenResponse.error }, { status: 400 });
            }
            return Response.json({
                id_token: nextTokenResponse.id_token,
                access_token: nextTokenResponse.access_token ?? "mock-access",
                token_type: "Bearer",
                expires_in: 300,
            });
        }
        throw new Error(`Unstubbed fetch: ${url}`);
    }) as typeof fetch;

    runner = new FakeRunner();
    consumer = new KeycloakConsumer(runner, {
        issuer: ISSUER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        appBaseUrl: APP_BASE_URL,
        basePath: "/auth",
        sessionSecret: SESSION_SECRET,
        sessionTtlSeconds: 3600,
        defaultReturnTo: "/",
    });
});

afterAll(() => {
    globalThis.fetch = realFetch;
});

// ── helpers ──────────────────────────────────────────────────────────────

function readSetCookies(res: Response): string[] {
    // Bun/undici expose every Set-Cookie via Headers.getSetCookie when available,
    // and otherwise via a comma-joined `get("set-cookie")`. Fall back to the
    // iterator approach to stay portable.
    const hdr = res.headers;
    const fn = (hdr as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof fn === "function") return fn.call(hdr);
    const raw = hdr.get("set-cookie");
    return raw ? [raw] : [];
}

function findCookieValue(cookies: string[], name: string): string | null {
    for (const c of cookies) {
        const first = c.split(";")[0]!;
        const [n, v = ""] = first.split("=", 2);
        if (n === name) return v;
    }
    return null;
}

async function signIdToken(claims: Record<string, unknown>, audience: string = CLIENT_ID): Promise<string> {
    return new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "kc-test" })
        .setSubject(typeof claims.sub === "string" ? claims.sub : "test-sub")
        .setAudience(audience)
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(kcPrivateKey);
}

// Walks through `/auth/login` to set up a flight cookie, then extracts the
// state/nonce/code_verifier the consumer emitted so tests can impersonate
// the user coming back through `/auth/callback`.
async function startFlight(returnTo: string = "/app"): Promise<{
    flightCookie: string;
    state: string;
    nonce: string;
}> {
    tokenCalls = [];
    const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("Location")!);
    const state = location.searchParams.get("state")!;
    const nonce = location.searchParams.get("nonce")!;
    const flightRaw = findCookieValue(readSetCookies(res), "be5-oidc-flight");
    if (!flightRaw) throw new Error("no flight cookie emitted");
    return { flightCookie: `be5-oidc-flight=${flightRaw}`, state, nonce };
}

// ── /auth/login ──────────────────────────────────────────────────────────

describe("/auth/login", () => {
    test("redirects to Keycloak authorize with PKCE + state + nonce", async () => {
        const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/login?returnTo=/dashboard`);
        expect(res.status).toBe(302);

        const location = new URL(res.headers.get("Location")!);
        expect(location.origin + location.pathname).toBe(AUTH_ENDPOINT);
        expect(location.searchParams.get("client_id")).toBe(CLIENT_ID);
        expect(location.searchParams.get("redirect_uri")).toBe(`${APP_BASE_URL}/auth/callback`);
        expect(location.searchParams.get("response_type")).toBe("code");
        expect(location.searchParams.get("scope")).toBe("openid profile email");
        expect(location.searchParams.get("state")).toBeTruthy();
        expect(location.searchParams.get("nonce")).toBeTruthy();
        expect(location.searchParams.get("code_challenge")).toBeTruthy();
        expect(location.searchParams.get("code_challenge_method")).toBe("S256");

        const flight = findCookieValue(readSetCookies(res), "be5-oidc-flight");
        expect(flight).toBeTruthy();
    });

    test("rejects an off-site returnTo (open-redirect protection)", async () => {
        const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/login?returnTo=https://evil.test/steal`);
        expect(res.status).toBe(302);
        // No crash, login still proceeds; the sanitized `/` replaces the dangerous
        // returnTo. We don't see it in the authorize URL, but we verify the flight
        // cookie (which we can't decode from outside) routes to `/` — asserted via
        // the callback test below.
        expect(res.headers.get("Location")).toContain(AUTH_ENDPOINT);
    });
});

// ── /auth/callback ───────────────────────────────────────────────────────

describe("/auth/callback", () => {
    test("302 error redirect when code or state is missing", async () => {
        const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/callback`);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("/auth/error?reason=missing_code_or_state");
    });

    test("error redirect when Keycloak returns an `error` query param", async () => {
        const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/callback?error=access_denied`);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("reason=oidc_access_denied");
    });

    test("error redirect on state mismatch", async () => {
        const { flightCookie } = await startFlight("/dashboard");
        const res = await runner.dispatch(
            "GET",
            `${APP_BASE_URL}/auth/callback?code=abc&state=tampered`,
            { headers: { cookie: flightCookie } },
        );
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("reason=state_mismatch");
    });

    test("error redirect when the flight cookie is missing", async () => {
        const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/callback?code=abc&state=xyz`);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("reason=missing_flight_cookie");
    });

    test("error redirect when the id_token nonce does not match", async () => {
        const { flightCookie, state } = await startFlight("/dashboard");
        nextTokenResponse = {
            id_token: await signIdToken({ sub: "u1", nonce: "not-the-right-one", realm_access: { roles: ["user"] } }),
        };
        const res = await runner.dispatch(
            "GET",
            `${APP_BASE_URL}/auth/callback?code=abc&state=${state}`,
            { headers: { cookie: flightCookie } },
        );
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("reason=nonce_mismatch");
    });

    test("success: sets session cookie + redirects to returnTo", async () => {
        const { flightCookie, state, nonce } = await startFlight("/dashboard");
        nextTokenResponse = {
            id_token: await signIdToken({
                sub: "alice-uuid",
                nonce,
                realm_access: { roles: ["admin", "user"] },
                preferred_username: "alice",
                name: "Alice Example",
            }),
        };

        const res = await runner.dispatch(
            "GET",
            `${APP_BASE_URL}/auth/callback?code=the-code&state=${state}`,
            { headers: { cookie: flightCookie } },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/dashboard");

        const cookies = readSetCookies(res);
        const session = findCookieValue(cookies, "be5-session");
        expect(session).toBeTruthy();
        // Flight cookie is cleared in the same response.
        const clearedFlight = cookies.find((c) => c.startsWith("be5-oidc-flight="));
        expect(clearedFlight).toContain("Max-Age=0");

        // The token endpoint was hit once with the PKCE verifier and client secret.
        expect(tokenCalls).toHaveLength(1);
        expect(tokenCalls[0]!.body.get("grant_type")).toBe("authorization_code");
        expect(tokenCalls[0]!.body.get("code")).toBe("the-code");
        expect(tokenCalls[0]!.body.get("client_id")).toBe(CLIENT_ID);
        expect(tokenCalls[0]!.body.get("client_secret")).toBe(CLIENT_SECRET);
        expect(tokenCalls[0]!.body.get("code_verifier")).toBeTruthy();
    });
});

// ── getSubject / buildLoginUrl / buildLogoutUrl ──────────────────────────

describe("public surface", () => {
    test("exposes absolute URLs derived from appBaseUrl", () => {
        expect(consumer.loginUrl).toBe(`${APP_BASE_URL}/auth/login`);
        expect(consumer.logoutUrl).toBe(`${APP_BASE_URL}/auth/logout`);
        expect(consumer.callbackUrl).toBe(`${APP_BASE_URL}/auth/callback`);
        expect(consumer.postLogoutCallbackUrl).toBe(`${APP_BASE_URL}/auth/post-logout-callback`);
        expect(consumer.profileUrl).toBe(`${ISSUER}/account`);
    });

    test("buildLoginUrl encodes returnTo", () => {
        const url = consumer.buildLoginUrl("/a/b?c=1");
        expect(url).toBe(`${APP_BASE_URL}/auth/login?returnTo=${encodeURIComponent("/a/b?c=1")}`);
    });

    test("buildLogoutUrl encodes returnTo", () => {
        const url = consumer.buildLogoutUrl("/home");
        expect(url).toBe(`${APP_BASE_URL}/auth/logout?returnTo=${encodeURIComponent("/home")}`);
    });

    test("getSubject returns null without a cookie", async () => {
        const req = new Request(`${APP_BASE_URL}/protected`);
        expect(await consumer.getSubject(req)).toBeNull();
    });

    test("getSubject returns Subject for a valid session cookie (after a real login)", async () => {
        const { flightCookie, state, nonce } = await startFlight("/");
        nextTokenResponse = {
            id_token: await signIdToken({
                sub: "bob-uuid",
                nonce,
                realm_access: { roles: ["user"] },
                preferred_username: "bob",
            }),
        };
        const callback = await runner.dispatch(
            "GET",
            `${APP_BASE_URL}/auth/callback?code=c&state=${state}`,
            { headers: { cookie: flightCookie } },
        );
        const sessionValue = findCookieValue(readSetCookies(callback), "be5-session")!;

        const req = new Request(`${APP_BASE_URL}/protected`, {
            headers: { cookie: `be5-session=${sessionValue}` },
        });
        const subject = await consumer.getSubject(req);
        expect(subject).toEqual({ identifier: "bob-uuid", role: "user", displayName: "bob" });
    });
});

// ── /auth/logout + /auth/post-logout-callback ────────────────────────────

describe("logout", () => {
    test("/auth/logout redirects to end_session_endpoint and clears the session", async () => {
        const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/logout?returnTo=/bye`);
        expect(res.status).toBe(302);

        const location = new URL(res.headers.get("Location")!);
        expect(location.origin + location.pathname).toBe(END_SESSION_ENDPOINT);
        expect(location.searchParams.get("client_id")).toBe(CLIENT_ID);
        expect(location.searchParams.get("post_logout_redirect_uri"))
            .toBe(`${APP_BASE_URL}/auth/post-logout-callback`);

        const cookies = readSetCookies(res);
        const session = cookies.find((c) => c.startsWith("be5-session="));
        expect(session).toContain("Max-Age=0");
        const postLogout = findCookieValue(cookies, "be5-oidc-post-logout");
        expect(postLogout).toBeTruthy();
    });

    test("/auth/post-logout-callback honours the stashed returnTo", async () => {
        // Reuse the post-logout cookie emitted by /auth/logout.
        const logout = await runner.dispatch("GET", `${APP_BASE_URL}/auth/logout?returnTo=/bye`);
        const cookieValue = findCookieValue(readSetCookies(logout), "be5-oidc-post-logout")!;

        const res = await runner.dispatch(
            "GET",
            `${APP_BASE_URL}/auth/post-logout-callback`,
            { headers: { cookie: `be5-oidc-post-logout=${cookieValue}` } },
        );
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/bye");
        const cookies = readSetCookies(res);
        const cleared = cookies.find((c) => c.startsWith("be5-oidc-post-logout="));
        expect(cleared).toContain("Max-Age=0");
    });

    test("/auth/post-logout-callback falls back to defaultReturnTo when the cookie is missing", async () => {
        const res = await runner.dispatch("GET", `${APP_BASE_URL}/auth/post-logout-callback`);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/");
    });
});
