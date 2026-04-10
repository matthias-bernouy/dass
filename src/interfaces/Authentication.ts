import type { Middleware } from "./Runner";
import type { AccountSummary, Subject } from "./Subject";

/**
 * Core authentication contract. Any auth strategy (password, token, SSO, ...)
 * must expose these: the notion of a current subject, guards/middlewares,
 * logout, and administrative account management.
 *
 * Strategy-specific features (password flows, API tokens, OAuth) live in
 * separate capability interfaces — a provider declares which ones it supports
 * by implementing them alongside this one.
 */
export interface Authentication {

    readonly logoutPage: string;
    readonly adminAccountsPage: string;

    withRedirect(page: string, path: string): string;

    getSubject(req: Request): Promise<Subject | null>;
    isAuthenticated(req: Request): Promise<boolean>;
    guardAuthenticated(req: Request): Promise<Subject>;
    guardAdmin(req: Request): Promise<Subject>;

    /** Middleware that 401s unauthenticated requests. */
    readonly requireAuthenticated: Middleware;
    /** Middleware that 401s unauthenticated and 403s non-admins. */
    readonly requireAdmin: Middleware;

    /** Clears the session cookie. Always safe to call. */
    logout(): Response;

    /** Admin-only: list every registered account. */
    listAccounts(): Promise<AccountSummary[]>;
    /** Admin-only: delete an account by identifier. */
    deleteAccount(identifier: string): Promise<void>;
    /** Admin-only: change the role of an account. */
    setAccountRole(identifier: string, role: 'admin' | 'user'): Promise<void>;
}
