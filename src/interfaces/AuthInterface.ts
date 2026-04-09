import type { Middleware } from "./RunnerInterface";

export interface IBe5_Subject {
    identifier: string;
    role: 'admin' | 'user';
}

/** A richer account view returned by listAccounts (admin UI). */
export interface IBe5_AccountSummary extends IBe5_Subject {
    createdAt?: Date;
}

export interface IBe5_Authentication {

    readonly loginPage: string;
    readonly registerPage: string;
    readonly recoverPage: string;
    readonly resetPage: string;
    readonly logoutPage: string;
    readonly setupPage: string;
    readonly adminAccountsPage: string;

    /** True when the Authentication was constructed with an IBe5_Mailer. */
    readonly mailEnabled: boolean;

    withRedirect(page: string, path: string): string;

    getSubject(req: Request): Promise<IBe5_Subject | null>;
    isAuthenticated(req: Request): Promise<boolean>;
    guardAuthenticated(req: Request): Promise<IBe5_Subject>;
    guardAdmin(req: Request): Promise<IBe5_Subject>;

    /** Middleware that 401s unauthenticated requests. */
    readonly requireAuthenticated: Middleware;
    /** Middleware that 401s unauthenticated and 403s non-admins. */
    readonly requireAdmin: Middleware;

    /** Clears the session cookie. Always safe to call. */
    logout(): Response;

    /**
     * Generates a password reset token and emails it to the user.
     * No-op (throws) if the Authentication has no mailer configured.
     * Never reveals whether the email exists.
     */
    requestPasswordReset(email: string): Promise<void>;

    /** Consumes a reset token and applies a new password. */
    resetPassword(token: string, newPassword: string): Promise<void>;

    /** Updates the password of the currently-authenticated subject. */
    changePassword(req: Request, currentPassword: string, newPassword: string): Promise<void>;

    /** Admin-only: list every registered account. */
    listAccounts(): Promise<IBe5_AccountSummary[]>;
    /** Admin-only: create a new account with an explicit role. */
    createAccount(identifier: string, password: string, role: 'admin' | 'user'): Promise<IBe5_Subject>;
    /** Admin-only: delete an account by identifier (email). */
    deleteAccount(identifier: string): Promise<void>;
    /** Admin-only: change the role of an account. */
    setAccountRole(identifier: string, role: 'admin' | 'user'): Promise<void>;
}
