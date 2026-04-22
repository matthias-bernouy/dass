import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";

import type { AuthenticationConsumer } from "../interfaces/AuthenticationConsumer";
import type { DefaultRole, Subject } from "../interfaces/Authentication";
import type { Runner } from "../../Runner/Runner";

export type KeycloakConsumerConfig<Role extends string = DefaultRole> = {
    /**
     * OIDC issuer URL of the Keycloak realm, e.g.
     * `"http://localhost:8080/realms/aelf1er"`. The discovery document is
     * fetched from `${issuer}/.well-known/openid-configuration`.
     */
    issuer: string;

    /** OIDC `client_id` registered in the Keycloak realm. */
    clientId: string;

    /** OIDC client secret (required for confidential clients). */
    clientSecret: string;

    /**
     * Absolute base URL of this app (e.g. `"http://localhost:3000"`). Used
     * to derive `callbackUrl`, `postLogoutCallbackUrl`, `loginUrl` and
     * `logoutUrl`. Must match what is registered in Keycloak's Valid
     * Redirect URIs / Valid Post Logout Redirect URIs.
     */
    appBaseUrl: string;

    /** Path prefix under which this consumer mounts its routes. Defaults to `/auth`. */
    basePath?: string;

    /**
     * HMAC key used to sign the session and flight cookies. MUST be at
     * least 32 random bytes worth of entropy (e.g. `crypto.randomBytes(32)`
     * hex-encoded). Rotating this invalidates all existing sessions.
     */
    sessionSecret: string;

    /** Session lifetime in seconds. Defaults to 3600 (1h). */
    sessionTtlSeconds?: number;

    /** Local session cookie name. Defaults to `be5-session`. */
    cookieName?: string;

    /**
     * Forces the `Secure` cookie attribute. Auto-detected from
     * `appBaseUrl` (`https://` → true, `http://` → false).
     */
    cookieSecure?: boolean;

    /** Fallback URL when `returnTo` is missing. Defaults to `/`. */
    defaultReturnTo?: string;

    /** OIDC scopes to request. Defaults to `["openid", "profile", "email"]`. */
    scopes?: string[];

} & ([DefaultRole] extends [Role]
    ? {
        /**
         * Maps the verified claims (id_token + access_token merged) to a `Subject`.
         * Optional when `Role = DefaultRole` — the default mapper reads
         * Keycloak's `realm_access.roles` and promotes `"admin"` over `"user"`.
         * Override for client roles, custom claims, or external role sources.
         *
         * Returning `null` aborts the login with an error page.
         */
        claimsToSubject?: (claims: Record<string, unknown>) => Subject<Role> | null;
    }
    : {
        /**
         * Maps the verified claims (id_token + access_token merged) to a `Subject`.
         * REQUIRED when `Role` is customized beyond `DefaultRole`: the default
         * mapper only produces `"admin" | "user"`, so the socle can't guess
         * your role names, priority order, or source claim.
         *
         * Returning `null` aborts the login with an error page.
         */
        claimsToSubject: (claims: Record<string, unknown>) => Subject<Role> | null;
    });

type DiscoveryDocument = {
    authorization_endpoint: string;
    token_endpoint: string;
    end_session_endpoint: string;
    jwks_uri: string;
};

type FlightPayload = {
    kind: "flight";
    state: string;
    nonce: string;
    codeVerifier: string;
    returnTo: string;
};

type PostLogoutPayload = {
    kind: "post-logout";
    returnTo: string;
};

type SessionPayload<Role extends string> = {
    kind: "session";
    sub: string;
    role: Role;
    displayName?: string;
    /** id_token kept verbatim for RP-initiated logout (`id_token_hint`). */
    idTokenHint: string;
};

const FLIGHT_COOKIE = "be5-oidc-flight";
const POST_LOGOUT_COOKIE = "be5-oidc-post-logout";
const FLIGHT_TTL_SECONDS = 600;

/**
 * `AuthenticationConsumer` backed by Keycloak (or any OIDC-conformant IdP
 * with a discovery document). Uses Authorization Code + PKCE, verifies both
 * the id_token (identity) and the access_token (roles) against the IdP's
 * JWKS, and stores a short-lived HMAC-signed session cookie — no server-side
 * session store required.
 *
 * Registers four routes on the injected Runner, under `basePath`:
 *   - `GET /login`                     — starts the OIDC flow
 *   - `GET /callback`                  — completes login
 *   - `GET /logout`                    — starts RP-initiated logout
 *   - `GET /post-logout-callback`      — completes logout
 */
export class KeycloakConsumer<Role extends string = DefaultRole> implements AuthenticationConsumer<Role> {

    readonly loginUrl: string;
    readonly logoutUrl: string;
    readonly profileUrl: string;
    readonly callbackUrl: string;
    readonly postLogoutCallbackUrl: string;

    private readonly _issuer: string;
    private readonly _clientId: string;
    private readonly _clientSecret: string;
    private readonly _basePath: string;
    private readonly _appBaseUrl: string;
    private readonly _sessionKey: Uint8Array;
    private readonly _sessionTtlSeconds: number;
    private readonly _cookieName: string;
    private readonly _cookieSecure: boolean;
    private readonly _defaultReturnTo: string;
    private readonly _scopes: string[];
    private readonly _claimsToSubject: (claims: Record<string, unknown>) => Subject<Role> | null;
    private readonly _jwks: ReturnType<typeof createRemoteJWKSet>;
    private _discoveryPromise: Promise<DiscoveryDocument> | null = null;

    constructor(runner: Runner, config: KeycloakConsumerConfig<Role>) {
        if (!config.sessionSecret || config.sessionSecret.length < 16) {
            throw new Error("KeycloakConsumer: sessionSecret must be a strong secret (>= 16 chars).");
        }

        this._issuer = stripTrailingSlash(config.issuer);
        this._clientId = config.clientId;
        this._clientSecret = config.clientSecret;
        this._appBaseUrl = stripTrailingSlash(config.appBaseUrl);
        this._basePath = config.basePath ?? "/auth";
        this._sessionKey = new TextEncoder().encode(config.sessionSecret);
        this._sessionTtlSeconds = config.sessionTtlSeconds ?? 3600;
        this._cookieName = config.cookieName ?? "be5-session";
        this._cookieSecure = config.cookieSecure ?? detectCookieSecure(this._appBaseUrl);
        this._defaultReturnTo = config.defaultReturnTo ?? "/";
        this._scopes = config.scopes ?? ["openid", "profile", "email"];
        // Safe cast: the conditional type on `claimsToSubject` ensures `config.claimsToSubject`
        // is present whenever `Role ≠ DefaultRole`. The default mapper only appears in the
        // `Role = DefaultRole` branch, where `Subject<DefaultRole>` is assignable to `Subject<Role>`.
        this._claimsToSubject = (config.claimsToSubject ?? defaultClaimsToSubject) as (claims: Record<string, unknown>) => Subject<Role> | null;

        this.loginUrl = `${this._appBaseUrl}${this._basePath}/login`;
        this.logoutUrl = `${this._appBaseUrl}${this._basePath}/logout`;
        this.profileUrl = `${this._issuer}/account`;
        this.callbackUrl = `${this._appBaseUrl}${this._basePath}/callback`;
        this.postLogoutCallbackUrl = `${this._appBaseUrl}${this._basePath}/post-logout-callback`;

        this._jwks = createRemoteJWKSet(new URL(`${this._issuer}/protocol/openid-connect/certs`));

        runner.group(this._basePath, (r) => {
            r.get("/login", (req) => this._startLogin(req));
            r.get("/callback", (req) => this.completeLogin(req));
            r.get("/logout", (req) => this._startLogout(req));
            r.get("/post-logout-callback", (req) => this.completeLogout(req));
        });
    }

    // ── Authentication<Role> ─────────────────────────────────────────────

    buildLoginUrl(returnTo: string): string {
        return `${this.loginUrl}?returnTo=${encodeURIComponent(returnTo)}`;
    }

    buildLogoutUrl(returnTo: string): string {
        return `${this.logoutUrl}?returnTo=${encodeURIComponent(returnTo)}`;
    }

    async getSubject(req: Request): Promise<Subject<Role> | null> {
        const session = await this._readSession(req);
        if (!session) return null;
        return { identifier: session.sub, role: session.role, displayName: session.displayName };
    }

    // ── AuthenticationConsumer<Role> ─────────────────────────────────────

    async completeLogin(req: Request): Promise<Response> {
        const url = new URL(req.url);

        const error = url.searchParams.get("error");
        if (error) return this._errorRedirect(`oidc_${error}`);

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return this._errorRedirect("missing_code_or_state");

        const rawFlight = readCookie(req, FLIGHT_COOKIE);
        if (!rawFlight) return this._errorRedirect("missing_flight_cookie");

        let flight: FlightPayload;
        try {
            flight = await this._verifyFlight(rawFlight);
        } catch {
            return this._errorRedirect("invalid_flight_cookie");
        }

        if (flight.state !== state) return this._errorRedirect("state_mismatch");

        const tokens = await this._exchangeCode(code, flight.codeVerifier);
        if (!tokens) return this._errorRedirect("token_exchange_failed");

        let idClaims: Record<string, unknown>;
        try {
            const { payload } = await jwtVerify(tokens.id_token, this._jwks, {
                issuer: this._issuer,
                audience: this._clientId,
            });
            idClaims = payload as Record<string, unknown>;
        } catch {
            return this._errorRedirect("id_token_verification_failed");
        }

        if (idClaims.nonce !== flight.nonce) return this._errorRedirect("nonce_mismatch");

        // Keycloak emits realm_access / resource_access in the access_token, not the id_token.
        // Audience intentionally not enforced: access tokens target resource servers, not the RP.
        let accessClaims: Record<string, unknown>;
        try {
            const { payload } = await jwtVerify(tokens.access_token, this._jwks, {
                issuer: this._issuer,
            });
            accessClaims = payload as Record<string, unknown>;
        } catch {
            return this._errorRedirect("access_token_verification_failed");
        }

        // id_token claims win on overlap — identity is authoritative from the id_token,
        // access_token only contributes role/permission claims.
        const claims = { ...accessClaims, ...idClaims };

        const subject = this._claimsToSubject(claims);
        if (!subject) return this._errorRedirect("no_subject_from_claims");

        const session = await this._signSession({
            kind: "session",
            sub: subject.identifier,
            role: subject.role,
            displayName: subject.displayName,
            idTokenHint: tokens.id_token,
        });

        const headers = new Headers();
        headers.append("Set-Cookie", this._buildSessionCookie(session, this._sessionTtlSeconds));
        headers.append("Set-Cookie", this._buildFlightCookie("", 0));
        headers.set("Location", sanitizeReturnTo(flight.returnTo, this._defaultReturnTo));
        return new Response(null, { status: 302, headers });
    }

    async completeLogout(req: Request): Promise<Response> {
        const raw = readCookie(req, POST_LOGOUT_COOKIE);
        let returnTo = this._defaultReturnTo;
        if (raw) {
            try {
                const payload = await this._verifyPostLogout(raw);
                returnTo = sanitizeReturnTo(payload.returnTo, this._defaultReturnTo);
            } catch { /* fall through to default */ }
        }

        const headers = new Headers();
        headers.append("Set-Cookie", this._buildPostLogoutCookie("", 0));
        headers.set("Location", returnTo);
        return new Response(null, { status: 302, headers });
    }

    // ── local route handlers ─────────────────────────────────────────────

    private async _startLogin(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo") ?? "", this._defaultReturnTo);

        const state = randomUrlSafe(32);
        const nonce = randomUrlSafe(32);
        const codeVerifier = randomUrlSafe(64);
        const codeChallenge = await pkceChallenge(codeVerifier);

        const flightCookie = await this._signFlight({ kind: "flight", state, nonce, codeVerifier, returnTo });

        const disco = await this._discovery();
        const authorize = new URL(disco.authorization_endpoint);
        authorize.searchParams.set("client_id", this._clientId);
        authorize.searchParams.set("response_type", "code");
        authorize.searchParams.set("redirect_uri", this.callbackUrl);
        authorize.searchParams.set("scope", this._scopes.join(" "));
        authorize.searchParams.set("state", state);
        authorize.searchParams.set("nonce", nonce);
        authorize.searchParams.set("code_challenge", codeChallenge);
        authorize.searchParams.set("code_challenge_method", "S256");

        const headers = new Headers();
        headers.append("Set-Cookie", this._buildFlightCookie(flightCookie, FLIGHT_TTL_SECONDS));
        headers.set("Location", authorize.toString());
        return new Response(null, { status: 302, headers });
    }

    private async _startLogout(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo") ?? "", this._defaultReturnTo);

        const session = await this._readSession(req);

        const disco = await this._discovery();
        const end = new URL(disco.end_session_endpoint);
        end.searchParams.set("client_id", this._clientId);
        end.searchParams.set("post_logout_redirect_uri", this.postLogoutCallbackUrl);
        if (session?.idTokenHint) end.searchParams.set("id_token_hint", session.idTokenHint);

        const stash = await this._signPostLogout({ kind: "post-logout", returnTo });

        const headers = new Headers();
        headers.append("Set-Cookie", this._clearSessionCookie());
        headers.append("Set-Cookie", this._buildPostLogoutCookie(stash, FLIGHT_TTL_SECONDS));
        headers.set("Location", end.toString());
        return new Response(null, { status: 302, headers });
    }

    // ── OIDC token exchange ──────────────────────────────────────────────

    private async _exchangeCode(code: string, codeVerifier: string): Promise<{ id_token: string; access_token: string } | null> {
        const disco = await this._discovery();
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: this.callbackUrl,
            client_id: this._clientId,
            client_secret: this._clientSecret,
            code_verifier: codeVerifier,
        });
        const res = await fetch(disco.token_endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
            body: body.toString(),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { id_token?: string; access_token?: string };
        if (!json.id_token || !json.access_token) return null;
        return { id_token: json.id_token, access_token: json.access_token };
    }

    // ── discovery ────────────────────────────────────────────────────────

    private async _discovery(): Promise<DiscoveryDocument> {
        if (!this._discoveryPromise) {
            this._discoveryPromise = fetch(`${this._issuer}/.well-known/openid-configuration`)
                .then(async (res) => {
                    if (!res.ok) throw new Error(`Discovery fetch failed (${res.status})`);
                    return (await res.json()) as DiscoveryDocument;
                })
                .catch((e) => {
                    // Invalidate the cache on failure so the next request retries.
                    this._discoveryPromise = null;
                    throw e;
                });
        }
        return this._discoveryPromise;
    }

    // ── cookies ──────────────────────────────────────────────────────────

    private _buildCookie(name: string, value: string, maxAgeSeconds: number, sameSite: "Lax" | "Strict"): string {
        const secure = this._cookieSecure ? " Secure;" : "";
        return `${name}=${value}; HttpOnly;${secure} SameSite=${sameSite}; Path=/; Max-Age=${maxAgeSeconds}`;
    }

    private _buildSessionCookie(value: string, maxAge: number): string {
        return this._buildCookie(this._cookieName, value, maxAge, "Lax");
    }

    private _clearSessionCookie(): string {
        return this._buildCookie(this._cookieName, "", 0, "Lax");
    }

    private _buildFlightCookie(value: string, maxAge: number): string {
        return this._buildCookie(FLIGHT_COOKIE, value, maxAge, "Lax");
    }

    private _buildPostLogoutCookie(value: string, maxAge: number): string {
        return this._buildCookie(POST_LOGOUT_COOKIE, value, maxAge, "Lax");
    }

    // ── session / flight signing (HS256 JWTs as self-contained blobs) ────

    private async _signSession(payload: SessionPayload<Role>): Promise<string> {
        return new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(`${this._sessionTtlSeconds}s`)
            .sign(this._sessionKey);
    }

    private async _readSession(req: Request): Promise<SessionPayload<Role> | null> {
        const raw = readCookie(req, this._cookieName);
        if (!raw) return null;
        try {
            const { payload } = await jwtVerify(raw, this._sessionKey, { algorithms: ["HS256"] });
            if ((payload as { kind?: string }).kind !== "session") return null;
            return payload as unknown as SessionPayload<Role>;
        } catch {
            return null;
        }
    }

    private async _signFlight(payload: FlightPayload): Promise<string> {
        return new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(`${FLIGHT_TTL_SECONDS}s`)
            .sign(this._sessionKey);
    }

    private async _verifyFlight(raw: string): Promise<FlightPayload> {
        const { payload } = await jwtVerify(raw, this._sessionKey, { algorithms: ["HS256"] });
        if ((payload as { kind?: string }).kind !== "flight") throw new Error("Not a flight payload");
        return payload as unknown as FlightPayload;
    }

    private async _signPostLogout(payload: PostLogoutPayload): Promise<string> {
        return new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(`${FLIGHT_TTL_SECONDS}s`)
            .sign(this._sessionKey);
    }

    private async _verifyPostLogout(raw: string): Promise<PostLogoutPayload> {
        const { payload } = await jwtVerify(raw, this._sessionKey, { algorithms: ["HS256"] });
        if ((payload as { kind?: string }).kind !== "post-logout") throw new Error("Not a post-logout payload");
        return payload as unknown as PostLogoutPayload;
    }

    // ── errors ───────────────────────────────────────────────────────────

    private _errorRedirect(reason: string): Response {
        const url = `${this._basePath}/error?reason=${encodeURIComponent(reason)}`;
        const headers = new Headers();
        headers.append("Set-Cookie", this._buildFlightCookie("", 0));
        headers.set("Location", url);
        return new Response(null, { status: 302, headers });
    }
}

// ── helpers ──────────────────────────────────────────────────────────────

/**
 * Extracts the Subject from id_token claims. Defaults to Keycloak
 * conventions (`sub`, `realm_access.roles`, `preferred_username`/`name`).
 * Override via `config.claimsToSubject` for different setups.
 */
function defaultClaimsToSubject(claims: Record<string, unknown>): Subject<DefaultRole> | null {
    const sub = typeof claims.sub === "string" ? claims.sub : null;
    if (!sub) return null;

    const realmAccess = claims["realm_access"] as { roles?: string[] } | undefined;
    const roles = realmAccess?.roles ?? [];
    const role: DefaultRole = roles.includes("admin") ? "admin" : "user";

    const displayName =
        (typeof claims["name"] === "string" ? claims["name"] : undefined) ??
        (typeof claims["preferred_username"] === "string" ? claims["preferred_username"] : undefined) ??
        (typeof claims["email"] === "string" ? claims["email"] : undefined);

    return { identifier: sub, role, displayName };
}

function readCookie(req: Request, name: string): string | null {
    const header = req.headers.get("cookie");
    if (!header) return null;
    const prefix = `${name}=`;
    return header
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(prefix))
        ?.slice(prefix.length) ?? null;
}

function stripTrailingSlash(s: string): string {
    return s.replace(/\/+$/, "");
}

function detectCookieSecure(url: string): boolean {
    try { return new URL(url).protocol === "https:"; } catch { return true; }
}

/**
 * Rejects absolute URLs and anything that doesn't start with `/` to prevent
 * open redirects. Also strips the scheme/host just in case a relative-looking
 * `//evil.com` sneaks in.
 */
function sanitizeReturnTo(candidate: string, fallback: string): string {
    if (!candidate) return fallback;
    if (!candidate.startsWith("/")) return fallback;
    if (candidate.startsWith("//")) return fallback;
    return candidate;
}

function randomUrlSafe(bytes: number): string {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    return base64UrlEncode(buf);
}

async function pkceChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
