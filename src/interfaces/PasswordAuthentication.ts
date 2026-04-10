import type { Subject } from "./Subject";

/**
 * Capability: email + password authentication.
 *
 * A provider that implements this exposes the full password lifecycle —
 * login/register/recovery pages, account creation with a password, password
 * change and reset flows. Consumers that only speak token/SSO can ignore it.
 */
export interface PasswordAuthentication {

    readonly loginPage: string;
    readonly registerPage: string;
    readonly recoverPage: string;
    readonly resetPage: string;
    readonly setupPage: string;

    /** True when the provider was constructed with a Mailer. */
    readonly mailEnabled: boolean;

    /** Admin-only: create a new account with an explicit password and role. */
    createAccount(identifier: string, password: string, role: 'admin' | 'user'): Promise<Subject>;

    /** Updates the password of the currently-authenticated subject. */
    changePassword(req: Request, currentPassword: string, newPassword: string): Promise<void>;

    /**
     * Generates a password reset token and emails it to the user.
     * Throws if no mailer is configured. Never reveals whether the email exists.
     */
    requestPasswordReset(email: string): Promise<void>;

    /** Consumes a reset token and applies a new password. */
    resetPassword(token: string, newPassword: string): Promise<void>;
}
