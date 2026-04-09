
export type TSubject = {
    id?: string;
    email: string;
    passwordHash: string;
    role: 'admin' | 'user';
    createdAt?: Date;

    /** sha256 hex of the active password-reset token, or null. */
    passwordResetTokenHash?: string | null;
    /** Expiry of the active reset token. */
    passwordResetExpiresAt?: Date | null;
}

export interface AuthRepository {

    findByEmail(email: string): Promise<TSubject | null>;
    findByResetTokenHash(tokenHash: string): Promise<TSubject | null>;

    register(subject: TSubject): Promise<TSubject>;

    updatePassword(email: string, passwordHash: string): Promise<void>;
    updateRole(email: string, role: 'admin' | 'user'): Promise<void>;

    setResetToken(email: string, tokenHash: string, expiresAt: Date): Promise<void>;
    clearResetToken(email: string): Promise<void>;

    delete(email: string): Promise<void>;
    list(): Promise<TSubject[]>;
    count(): Promise<number>;

}
