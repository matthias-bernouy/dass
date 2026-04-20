export interface Subject {
    identifier: string;
    role: 'admin' | 'user';
}

/** A richer account view returned by listAccounts (admin UI). */
export interface AccountSummary extends Subject {
    createdAt?: Date;
}
