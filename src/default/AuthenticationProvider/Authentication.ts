import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { join } from "node:path";

import type { IBe5_AccountSummary, IBe5_Authentication, IBe5_Subject } from "../../interfaces/AuthInterface";
import type { IBe5_Runner, Middleware } from "../../interfaces/RunnerInterface";
import type { IBe5_Mailer } from "../../interfaces/MailerInterface";
import type { AuthRepository } from "./interfaces/repository/AuthRepository";

import { loginSubmit } from "./api/loginSubmit";
import { registerSubmit } from "./api/registerSubmit";
import { logoutHandler } from "./api/logoutHandler";
import { recoverSubmit } from "./api/recoverSubmit";
import { resetSubmit } from "./api/resetSubmit";
import { setupSubmit } from "./api/setupSubmit";
import { changePasswordSubmit } from "./api/changePasswordSubmit";
import { adminListAccounts, adminCreateAccount, adminDeleteAccount, adminUpdateRole } from "./api/adminAccounts";

import loginPage from "./pages/login.page.html" with { type: "text" };
import registerPage from "./pages/register.page.html" with { type: "text" };
import disabledPage from "./pages/disabled.page.html" with { type: "text" };
import setupPage from "./pages/setup.page.html" with { type: "text" };
import recoverPage from "./pages/recover.page.html" with { type: "text" };
import resetPage from "./pages/reset.page.html" with { type: "text" };
import adminAccountsPage from "./pages/admin.accounts.page.html" with { type: "text" };

import { send_html } from "./utilities/send_html";

interface Be5_TokenPayload {
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
     */
    baseUrl?: string;

    /**
     * Optional mailer. If omitted, email-dependent features
     * (requestPasswordReset) throw and the HTTP routes return 503.
     */
    mailer?: IBe5_Mailer;

    /** Lifetime of a password reset token in minutes. Defaults to 30. */
    resetTokenTtlMinutes?: number;

    /** "From" address used for outgoing auth emails. */
    mailFrom?: string;
};

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export class Authentication implements IBe5_Authentication {

    public registerDisabled: boolean;
    public defaultRedirection: string;

    private _repository: AuthRepository;
    private _mailer: IBe5_Mailer | null;
    private _baseUrl: string | null;
    private _resetTtlMs: number;
    private _mailFrom: string | undefined;
    private _basePath: string;

    public readonly loginPage: string;
    public readonly registerPage: string;
    public readonly recoverPage: string;
    public readonly resetPage: string;
    public readonly logoutPage: string;
    public readonly setupPage: string;
    public readonly adminAccountsPage: string;

    constructor(repository: AuthRepository, runner: IBe5_Runner, config?: AuthConfig) {

        this._repository = repository;
        this._mailer = config?.mailer ?? null;
        this._baseUrl = config?.baseUrl ?? null;
        this._resetTtlMs = (config?.resetTokenTtlMinutes ?? 30) * 60 * 1000;
        this._mailFrom = config?.mailFrom;
        this._basePath = config?.basePath || "/auth";

        let htmlLoginPage = (loginPage as unknown as string).replace('defaultRedirect = "/"', `defaultRedirect = "${config?.defaultRedirection || "/"}";`);
        const htmlRegisterPage = (registerPage as unknown as string).replace('defaultRedirect = "/"', `defaultRedirect = "${config?.defaultRedirection || "/"}";`);

        // Strip the "forgot password" link when no mailer is configured,
        // otherwise clicking it would land on a 503.
        if (!this._mailer) {
            htmlLoginPage = htmlLoginPage.replace(/<!--FORGOT_LINK-->[\s\S]*?<!--\/FORGOT_LINK-->/, "");
        }

        this.registerDisabled = config?.registerDisabled || false;
        this.defaultRedirection = config?.defaultRedirection || "/";

        this.loginPage = join(this._basePath, "login");
        this.registerPage = join(this._basePath, "register");
        this.recoverPage = join(this._basePath, "recover");
        this.resetPage = join(this._basePath, "reset");
        this.logoutPage = join(this._basePath, "logout");
        this.setupPage = join(this._basePath, "setup");
        this.adminAccountsPage = join(this._basePath, "admin/accounts");

        runner.group(this._basePath, (r) => {
            // ── existing flow ────────────────────────────────────────────
            r.post("/loginSubmit", (req) => loginSubmit(req, this));
            r.post("/registerSubmit", (req) => registerSubmit(req, this));

            r.get("/login", () => send_html(htmlLoginPage));
            r.get("/register", async () => {
                const count = await this._repository.count();
                // No account yet → force the first-run setup flow.
                if (count === 0) {
                    return new Response(null, { status: 302, headers: { Location: this.setupPage } });
                }
                if (this.registerDisabled) {
                    return send_html(disabledPage as unknown as string);
                }
                return send_html(htmlRegisterPage);
            });

            // ── logout ───────────────────────────────────────────────────
            r.get("/logout", (req) => logoutHandler(req, this));

            // ── first-run setup (only reachable while DB is empty) ───────
            r.get("/setup", async () => {
                const count = await this._repository.count();
                if (count > 0) return new Response("Setup already completed", { status: 404 });
                return send_html(setupPage as unknown as string);
            });
            r.post("/setupSubmit", (req) => setupSubmit(req, this));

            // ── password recovery (mailer-gated) ─────────────────────────
            r.get("/recover", () => {
                if (!this._mailer) {
                    return new Response("Password recovery is disabled on this server", { status: 503 });
                }
                return send_html(recoverPage as unknown as string);
            });
            r.post("/recoverSubmit", (req) => recoverSubmit(req, this));

            r.get("/reset", () => send_html(resetPage as unknown as string));
            r.post("/resetSubmit", (req) => resetSubmit(req, this));

            // ── change password (authenticated user) ─────────────────────
            r.post("/changePasswordSubmit", (req) => changePasswordSubmit(req, this), [this.requireAuthenticated]);

            // ── admin area (admin-only) ──────────────────────────────────
            // Middleware is applied per-route because the runner's nested-group
            // middleware merging is currently lossy.
            const adminGuard = [this.requireAdmin];
            r.get("/admin/accounts", () => send_html(adminAccountsPage as unknown as string), adminGuard);
            r.get("/admin/api/accounts", (req) => adminListAccounts(req, this), adminGuard);
            r.post("/admin/api/accounts", (req) => adminCreateAccount(req, this), adminGuard);
            r.delete("/admin/api/accounts", (req) => adminDeleteAccount(req, this), adminGuard);
            r.patch("/admin/api/accounts", (req) => adminUpdateRole(req, this), adminGuard);
        });
    }

    // ── accessors ────────────────────────────────────────────────────────

    get repository(): AuthRepository {
        return this._repository;
    }

    get mailEnabled(): boolean {
        return this._mailer !== null;
    }

    // ── subject / guards ─────────────────────────────────────────────────

    async getSubject(req: Request): Promise<IBe5_Subject | null> {
        const cookieHeader = req.headers.get("cookie");
        if (!cookieHeader) return null;

        const token = cookieHeader
            .split(";")
            .map(c => c.trim())
            .find(c => c.startsWith("Be5Credentials="))
            ?.split("=")[1];

        if (!token) return null;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
            const data = payload as unknown as Be5_TokenPayload;
            return { identifier: data.email, role: data.role };
        } catch (error) {
            console.error("JWT Verification failed:", error instanceof Error ? error.message : error);
            return null;
        }
    }

    async isAuthenticated(req: Request): Promise<boolean> {
        const subject = await this.getSubject(req);
        return subject !== null;
    }

    async guardAuthenticated(req: Request): Promise<IBe5_Subject> {
        const subject = await this.getSubject(req);
        if (!subject) throw new Error("AuthenticationError: Access Denied");
        return subject;
    }

    async guardAdmin(req: Request): Promise<IBe5_Subject> {
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
        return logoutHandler(new Request("http://localhost"), this);
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

    async listAccounts(): Promise<IBe5_AccountSummary[]> {
        const accounts = await this._repository.list();
        return accounts.map(a => ({
            identifier: a.email,
            role: a.role,
            createdAt: a.createdAt,
        }));
    }

    async createAccount(identifier: string, password: string, role: "admin" | "user"): Promise<IBe5_Subject> {
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
}

// ── helpers ──────────────────────────────────────────────────────────────

function generateResetToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

/** Convenience factory: produces a signed JWT for use by login handlers. */
export async function signAuthJwt(payload: Be5_TokenPayload): Promise<string> {
    return await new SignJWT({ email: payload.email, sub: payload.sub, role: payload.role })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);
}
