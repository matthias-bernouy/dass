import type { DefaultRole, Subject } from "./Authentication";

/**
 * Orthogonal collaborator used by app-layer guards to authenticate
 * non-browser clients (CLIs, CI, scripts) via `Authorization: Bearer ...`.
 *
 * `ApiTokens` is deliberately not part of `Authentication`: most OIDC flows
 * handle sessions via browser cookies, and bearer tokens are a separate
 * concern with different lifetime / storage / revocation semantics. A
 * consumer that needs both composes them at the guard layer.
 *
 * Guards using an `ApiTokens` MUST short-circuit on presence of a bearer
 * header — a valid token means the request isn't from a browser and MUST
 * NOT be answered with a 302 to a login page. A rejected token MUST produce
 * a hard 401 instead.
 *
 * @typeParam Role - Role union; should match the `Authentication` used
 *                   alongside this `ApiTokens`.
 */
export interface ApiTokens<Role extends string = DefaultRole> {
    /**
     * Verifies a raw bearer token and resolves to the bound Subject. Returns
     * `null` for unknown, revoked, or expired tokens — never throws for
     * routine rejection.
     */
    verify(token: string): Promise<Subject<Role> | null>;
}
