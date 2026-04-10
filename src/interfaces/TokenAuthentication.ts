/**
 * A token record as returned to callers listing existing tokens. The raw
 * secret is NEVER returned here — it is only known at creation time.
 */
export interface TokenSummary {
    id: string;
    identifier: string;
    name?: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface CreateTokenOptions {
    /** How long the token stays valid, in minutes. */
    expiresInMinutes: number;
    /** Optional human label (e.g. "ci-deploy", "mobile-app"). */
    name?: string;
}

export interface CreateTokenResult {
    id: string;
    /**
     * The raw token string. This is the ONLY opportunity the caller has to
     * read it — the provider only persists its hash.
     */
    token: string;
    expiresAt: Date;
}

/**
 * Capability: opaque API tokens bound to a user account.
 *
 * A provider that implements this can mint time-bound tokens tied to a
 * subject, list them, and revoke them. When the token is presented via
 * `Authorization: Bearer <token>`, the core `Authentication.getSubject`
 * of the same provider should resolve it to the owning subject.
 */
export interface TokenAuthentication {

    /** Path of the self-service token management page. */
    readonly tokensPage: string;

    /**
     * Issues a new token for the given identifier. The raw token is only
     * returned by this call — persist it immediately if you need it later.
     */
    createToken(identifier: string, options: CreateTokenOptions): Promise<CreateTokenResult>;

    /** Lists the metadata of every token belonging to the identifier. */
    listTokens(identifier: string): Promise<TokenSummary[]>;

    /** Revokes a token by its id. No-op if the token does not exist. */
    deleteToken(id: string): Promise<void>;

    /**
     * Returns the HTTP headers a client must attach to a request so that
     * this provider's `getSubject` can authenticate the call. Abstracts the
     * on-the-wire format (Bearer, X-Api-Key, signed header, ...) away from
     * consumers.
     *
     * Typical usage:
     * ```ts
     * await fetch(url, { headers: auth.tokenAuthHeaders(rawToken) });
     * ```
     *
     * `Request` objects are immutable, so the contract returns the headers
     * to attach at construction time rather than mutating an existing one.
     */
    tokenAuthHeaders(token: string): Record<string, string>;
}
