import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import type { AccountSummary, Subject } from "./Subject";
import type { Authentication } from "./Authentication";
import type { PasswordAuthentication } from "./PasswordAuthentication";
import type {
    CreateTokenOptions,
    CreateTokenResult,
    TokenAuthentication,
    TokenSummary,
} from "./TokenAuthentication";
import type { Runner, Middleware } from "../Runner/Runner";
import type { Mailer } from "../Mailer/Mailer";
import type { AuthRepository } from "./AuthRepository";

import { loginSubmit } from "./api/loginSubmit";
import { registerSubmit } from "./api/registerSubmit";
import { logoutHandler } from "./api/logoutHandler";
import { recoverSubmit } from "./api/recoverSubmit";
import { resetSubmit } from "./api/resetSubmit";
import { setupSubmit } from "./api/setupSubmit";
import { changePasswordSubmit } from "./api/changePasswordSubmit";
import { adminListAccounts, adminCreateAccount, adminDeleteAccount, adminUpdateRole } from "./api/adminAccounts";
import { listMyTokens, createMyToken, deleteMyToken } from "./api/tokens";

import loginPage from "./pages/login.page.html" with { type: "text" };
import registerPage from "./pages/register.page.html" with { type: "text" };
import disabledPage from "./pages/disabled.page.html" with { type: "text" };
import setupPage from "./pages/setup.page.html" with { type: "text" };
import recoverPage from "./pages/recover.page.html" with { type: "text" };
import resetPage from "./pages/reset.page.html" with { type: "text" };
import adminAccountsPage from "./pages/admin.accounts.page.html" with { type: "text" };
import tokensPageHtml from "./pages/tokens.page.html" with { type: "text" };

import { sendHtml } from "./utilities/sendHtml";

interface TokenPayload {
    email: string;
    role: "admin" | "user";
    sub: string;
}

export type AuthConfig = {
    basePath?: string;
    registerDisabled?: boolean;
    defaultRedirection?: string;

    /**
     * Absolute public base URL of the app (e.g. "https://app.example.com").
     * Required for features that embed links in emails. If absent, reset
     * links fall back to a relative URL (which may not be clickable in mail
     * clients but still works for dev).
     *
     * Also drives the default value of the `Secure` cookie attribute: over
     * plain `http://` the browser silently drops `Secure` cookies, so the
     * session would never stick on a local dev server.
     */
    baseUrl?: string;

    /**
     * Forces the `Secure` cookie attribute on/off. Defaults to auto-detection
     * from `baseUrl` (`https://` → true, `http://` → false, unset → true).
     */
    cookieSecure?: boolean;

    /**
     * Optional mailer. If omitted, email-dependent features
     * (requestPasswordReset) throw and the HTTP routes return 503.
     */
    mailer?: Mailer;

    /** Lifetime of a password reset token in minutes. Defaults to 30. */
    resetTokenTtlMinutes?: number;

    /** "From" address used for outgoing auth emails. */
    mailFrom?: string;
};

const SESSION_MAX_AGE_SECONDS = 7200;
const SESSION_COOKIE_NAME = "Be5Credentials";

function loadJwtSecret(): Uint8Array {
    const raw = process.env.JWT_SECRET;
    if (!raw) {
        throw new Error("JWT_SECRET environment variable is required for DefaultAuthentication");
    }
    return new TextEncoder().encode(raw);
}

function joinUrlPath(a: string, b: string): string {
    return ("/" + a + "/" + b).replace(/\/+/g, "/");
}

export class DefaultAuthentication implements Authentication, PasswordAuthentication, TokenAuthentication {

    public registerDisabled: boolean;
    public defaultRedirection: string;

    private _repository: AuthRepository;
    private _mailer: Mailer | null;
    private _baseUrl: string | null;
    private _resetTtlMs: number;
    private _mailFrom: string | undefined;
    private _basePath: string;
    private _cookieSecure: boolean;
    private _jwtSecret: Uint8Array;

    public readonly loginPage: string;
    public readonly registerPage: string;
    public readonly recoverPage: string;
    public readonly resetPage: string;
    public readonly logoutPage: string;
    public readonly setupPage: string;
    public readonly adminAccountsPage: string;
    public readonly tokensPage: string;

    constructor(repository: AuthRepository, runner: Runner, config?: AuthConfig) {

        this._jwtSecret = loadJwtSecret();
        this._repository = repository;
        this._mailer = config?.mailer ?? null;
        this._baseUrl = config?.baseUrl ?? null;
        this._resetTtlMs = (config?.resetTokenTtlMinutes ?? 30) * 60 * 1000;
        this._mailFrom = config?.mailFrom;
        this._basePath = config?.basePath || "/auth";
        this._cookieSecure = config?.cookieSecure ?? detectCookieSecure(this._baseUrl);

        const redirectLiteral = JSON.stringify(config?.defaultRedirection || "/");
        let htmlLoginPage = (loginPage as unknown as string).replace(
            'const defaultRedirect = "/";',
            `const defaultRedirect = ${redirectLiteral};`
        );
        const htmlRegisterPage = (registerPage as unknown as string).replace(
            'const defaultRedirect = "/";',
            `const defaultRedirect = ${redirectLiteral};`
        );

        // Strip the "forgot password" link when no mailer is configured,
        // otherwise clicking it would land on a 503.
        if (!this._mailer) {
            htmlLoginPage = htmlLoginPage.replace(/<!--FORGOT_LINK-->[\s\S]*?<!--\/FORGOT_LINK-->/, "");
        }

        this.registerDisabled = config?.registerDisabled || false;
        this.defaultRedirection = config?.defaultRedirection || "/";

        this.loginPage = joinUrlPath(this._basePath, "login");
        this.registerPage = joinUrlPath(this._basePath, "register");
        this.recoverPage = joinUrlPath(this._basePath, "recover");
        this.resetPage = joinUrlPath(this._basePath, "reset");
        this.logoutPage = joinUrlPath(this._basePath, "logout");
        this.setupPage = joinUrlPath(this._basePath, "setup");
        this.adminAccountsPage = joinUrlPath(this._basePath, "admin/accounts");
        this.tokensPage = joinUrlPath(this._basePath, "tokens");

        runner.group(this._basePath, (r) => {
            r.post("/loginSubmit", (req) => loginSubmit(req, this));
            r.post("/registerSubmit", (req) => registerSubmit(req, this));

            r.get("/login", () => sendHtml(htmlLoginPage));
            r.get("/register", async () => {
                const count = await this._repository.count();
                // No account yet → force the first-run setup flow.
                if (count === 0) {
                    return new Response(null, { status: 302, headers: { Location: this.setupPage } });
                }
                if (this.registerDisabled) {
                    return sendHtml(disabledPage as unknown as string);
                }
                return sendHtml(htmlRegisterPage);
            });

            r.get("/logout", (req) => logoutHandler(req, this));

            // First-run setup (only reachable while DB is empty)
            r.get("/setup", async () => {
                const count = await this._repository.count();
                if (count > 0) return new Response("Setup already completed", { status: 404 });
                return sendHtml(setupPage as unknown as string);
            });
            r.post("/setupSubmit", (req) => setupSubmit(req, this));

            r.get("/recover", () => {
                if (!this._mailer) {
                    return new Response("Password recovery is disabled on this server", { status: 503 });
                }
                return sendHtml(recoverPage as unknown as string);
            });
            r.post("/recoverSubmit", (req) => recoverSubmit(req, this));

            r.get("/reset", () => sendHtml(resetPage as unknown as string));
            r.post("/resetSubmit", (req) => resetSubmit(req, this));

            r.post("/changePasswordSubmit", (req) => changePasswordSubmit(req, this), [this.requireAuthenticated]);

            r.group("/admin", (admin) => {
                admin.get("/accounts", () => sendHtml(adminAccountsPage as unknown as string));
                admin.get("/api/accounts", (req) => adminListAccounts(req, this));
                admin.post("/api/accounts", (req) => adminCreateAccount(req, this));
                admin.delete("/api/accounts", (req) => adminDeleteAccount(req, this));
                admin.patch("/api/accounts", (req) => adminUpdateRole(req, this));
            }, [this.requireAdmin]);

            r.group("/", (user) => {
                user.get("/tokens", () => sendHtml(tokensPageHtml as unknown as string));
                user.get("/api/tokens", (req) => listMyTokens(req, this));
                user.post("/api/tokens", (req) => createMyToken(req, this));
                user.delete("/api/tokens", (req) => deleteMyToken(req, this));
            }, [this.requireAuthenticated]);
        });
    }

    // ── accessors ────────────────────────────────────────────────────────

    get repository(): AuthRepository {
        return this._repository;
    }

    get mailEnabled(): boolean {
        return this._mailer !== null;
    }

    // ── session cookies ──────────────────────────────────────────────────

    /**
     * Signs a session JWT for the given subject and returns the full
     * `Set-Cookie` value handlers should attach to their Response.
     */
    async issueSessionCookie(args: { email: string; role: "admin" | "user"; id?: string }): Promise<string> {
        const jwt = await new SignJWT({ email: args.email, sub: args.id ?? args.email, role: args.role })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(this._jwtSecret);
        return this._buildSessionCookie(jwt, SESSION_MAX_AGE_SECONDS);
    }

    /** Returns a `Set-Cookie` value that clears the session cookie. */
    clearSessionCookie(): string {
        return this._buildSessionCookie("", 0);
    }

    private _buildSessionCookie(value: string, maxAgeSeconds: number): string {
        const secure = this._cookieSecure ? " Secure;" : "";
        return `${SESSION_COOKIE_NAME}=${value}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
    }

    // ── subject / guards ─────────────────────────────────────────────────

    async getSubject(req: Request): Promise<Subject | null> {
        // 1. API token via Authorization: Bearer <token>
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
            const raw = authHeader.slice(7).trim();
            if (raw) {
                const subject = await this._subjectFromApiToken(raw);
                if (subject) return subject;
            }
        }

        // 2. Session JWT via the session cookie
        const cookieHeader = req.headers.get("cookie");
        if (!cookieHeader) return null;

        const cookiePrefix = `${SESSION_COOKIE_NAME}=`;
        const token = cookieHeader
            .split(";")
            .map(c => c.trim())
            .find(c => c.startsWith(cookiePrefix))
            ?.slice(cookiePrefix.length);

        if (!token) return null;

        try {
            const { payload } = await jwtVerify(token, this._jwtSecret, { algorithms: ["HS256"] });
            const data = payload as unknown as TokenPayload;
            return { identifier: data.email, role: data.role };
        } catch (error) {
            console.error("JWT Verification failed:", error instanceof Error ? error.message : error);
            return null;
        }
    }

    private async _subjectFromApiToken(rawToken: string): Promise<Subject | null> {
        const tokenHash = await sha256Hex(rawToken);
        const record = await this._repository.findTokenByHash(tokenHash);
        if (!record) return null;
        if (new Date(record.expiresAt).getTime() <= Date.now()) return null;

        const user = await this._repository.findByEmail(record.userEmail);
        if (!user) return null;
        return { identifier: user.email, role: user.role };
    }

    async isAuthenticated(req: Request): Promise<boolean> {
        const subject = await this.getSubject(req);
        return subject !== null;
    }

    async guardAuthenticated(req: Request): Promise<Subject> {
        const subject = await this.getSubject(req);
        if (!subject) throw new Error("AuthenticationError: Access Denied");
        return subject;
    }

    async guardAdmin(req: Request): Promise<Subject> {
        const subject = await this.guardAuthenticated(req);
        if (subject.role !== "admin") throw new Error("AuthorizationError: Admin role required");
        return subject;
    }

    withRedirect(page: string, redirect: string): string {
        const url = new URL(page, "http://localhost");
        url.searchParams.set("redirect", redirect);
        return url.pathname + url.search;
    }

    // ── middlewares ──────────────────────────────────────────────────────

    get requireAuthenticated(): Middleware {
        return async (req, next) => {
            const subject = await this.getSubject(req);
            if (!subject) return new Response("Unauthorized", { status: 401 });
            return next();
        };
    }

    get requireAdmin(): Middleware {
        return async (req, next) => {
            const subject = await this.getSubject(req);
            if (!subject) return new Response("Unauthorized", { status: 401 });
            if (subject.role !== "admin") return new Response("Forbidden", { status: 403 });
            return next();
        };
    }

    // ── logout ───────────────────────────────────────────────────────────

    logout(): Response {
        return new Response(null, {
            status: 302,
            headers: {
                "Set-Cookie": this.clearSessionCookie(),
                "Location": this.loginPage,
            },
        });
    }

    // ── password recovery ────────────────────────────────────────────────

    async requestPasswordReset(email: string): Promise<void> {
        if (!this._mailer) {
            throw new Error("Password recovery is disabled: no mailer configured");
        }

        const user = await this._repository.findByEmail(email);
        // Silently no-op on unknown emails so callers can safely ignore.
        if (!user) return;

        const rawToken = generateResetToken();
        const tokenHash = await sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + this._resetTtlMs);

        await this._repository.setResetToken(email, tokenHash, expiresAt);

        const base = this._baseUrl ?? "";
        const resetUrl = `${base}${this.resetPage}?token=${encodeURIComponent(rawToken)}`;

        const ttlMinutes = Math.round(this._resetTtlMs / 60000);
        await this._mailer.send({
            to: email,
            from: this._mailFrom,
            subject: "Réinitialisation de votre mot de passe",
            text: `Pour réinitialiser votre mot de passe, ouvrez ce lien : ${resetUrl}\n\nCe lien expire dans ${ttlMinutes} minutes.`,
            html: `
                <p>Bonjour,</p>
                <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>Ce lien expire dans ${ttlMinutes} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
            `,
        });
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        if (!token || !newPassword) throw new Error("Token and password are required");

        const tokenHash = await sha256Hex(token);
        const user = await this._repository.findByResetTokenHash(tokenHash);
        if (!user) throw new Error("Invalid or expired token");

        const expiresAt = user.passwordResetExpiresAt ? new Date(user.passwordResetExpiresAt) : null;
        if (!expiresAt || expiresAt.getTime() < Date.now()) {
            throw new Error("Invalid or expired token");
        }

        const passwordHash = await hash(newPassword, 10);
        await this._repository.updatePassword(user.email, passwordHash);
        await this._repository.clearResetToken(user.email);
    }

    async changePassword(req: Request, currentPassword: string, newPassword: string): Promise<void> {
        const subject = await this.guardAuthenticated(req);
        const user = await this._repository.findByEmail(subject.identifier);
        if (!user) throw new Error("Account not found");

        const valid = await compare(currentPassword, user.passwordHash);
        if (!valid) throw new Error("Current password is incorrect");

        const passwordHash = await hash(newPassword, 10);
        await this._repository.updatePassword(user.email, passwordHash);
    }

    // ── admin ────────────────────────────────────────────────────────────

    async listAccounts(): Promise<AccountSummary[]> {
        const accounts = await this._repository.list();
        return accounts.map(a => ({
            identifier: a.email,
            role: a.role,
            createdAt: a.createdAt,
        }));
    }

    async createAccount(identifier: string, password: string, role: "admin" | "user"): Promise<Subject> {
        if (!identifier || !password) throw new Error("Email and password are required");
        const existing = await this._repository.findByEmail(identifier);
        if (existing) throw new Error("User already exists");
        const passwordHash = await hash(password, 10);
        const inserted = await this._repository.register({
            email: identifier,
            passwordHash,
            role,
        });
        return { identifier: inserted.email, role: inserted.role };
    }

    async deleteAccount(identifier: string): Promise<void> {
        const target = await this._repository.findByEmail(identifier);
        if (!target) return;
        if (target.role === "admin" && (await this.countAdmins()) <= 1) {
            throw new Error("Cannot delete the last admin account");
        }
        await this._repository.delete(identifier);
        // Revoke every API token owned by the account so stale secrets can't
        // outlive their user.
        await this._repository.deleteTokensForUser(identifier);
    }

    async setAccountRole(identifier: string, role: "admin" | "user"): Promise<void> {
        const target = await this._repository.findByEmail(identifier);
        if (!target) throw new Error("Account not found");
        if (target.role === "admin" && role !== "admin" && (await this.countAdmins()) <= 1) {
            throw new Error("Cannot demote the last admin account");
        }
        await this._repository.updateRole(identifier, role);
    }

    private async countAdmins(): Promise<number> {
        const accounts = await this._repository.list();
        return accounts.filter(a => a.role === "admin").length;
    }

    // ── API tokens ───────────────────────────────────────────────────────

    async createToken(identifier: string, options: CreateTokenOptions): Promise<CreateTokenResult> {
        if (!identifier) throw new Error("Identifier is required");
        if (!Number.isFinite(options.expiresInMinutes) || options.expiresInMinutes <= 0) {
            throw new Error("expiresInMinutes must be a positive number");
        }

        const user = await this._repository.findByEmail(identifier);
        if (!user) throw new Error("Account not found");

        const raw = generateOpaqueToken();
        const tokenHash = await sha256Hex(raw);
        const id = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + options.expiresInMinutes * 60 * 1000);

        await this._repository.createToken({
            id,
            userEmail: user.email,
            tokenHash,
            name: options.name,
            createdAt: now,
            expiresAt,
        });

        return { id, token: raw, expiresAt };
    }

    async listTokens(identifier: string): Promise<TokenSummary[]> {
        const records = await this._repository.listTokensForUser(identifier);
        return records.map(r => ({
            id: r.id,
            identifier: r.userEmail,
            name: r.name,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
        }));
    }

    async deleteToken(id: string): Promise<void> {
        if (!id) throw new Error("Token id is required");
        await this._repository.deleteTokenById(id);
    }

    tokenAuthHeaders(token: string): Record<string, string> {
        return { Authorization: `Bearer ${token}` };
    }
}

// ── helpers ──────────────────────────────────────────────────────────────

function detectCookieSecure(baseUrl: string | null): boolean {
    if (!baseUrl) return true;
    try {
        return new URL(baseUrl).protocol === "https:";
    } catch {
        return true;
    }
}

function generateResetToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function generateOpaqueToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    // "be5_" prefix makes tokens recognizable in logs / secret scanners.
    return `be5_${hex}`;
}

async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
