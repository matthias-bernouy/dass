import type { Authentication, DefaultRole } from "./Authentication";

/**
 * Extends `Authentication` with the server-side endpoints that finalise
 * the login and logout roundtrips. Unlike `Authentication`, this interface
 * DOES produce Responses — completing an OAuth/OIDC callback intrinsically
 * requires setting a session cookie and redirecting, which cannot be
 * delegated to the caller without leaking provider-specific details.
 *
 * Application code should depend on `Authentication` wherever possible and
 * only reach for `AuthenticationConsumer` when wiring the callback routes.
 * Most implementations register these routes on their Runner at
 * construction time and never expose `completeLogin` / `completeLogout`
 * directly.
 */
export interface AuthenticationConsumer<Role extends string = DefaultRole> extends Authentication<Role> {

    /**
     * Absolute URL where the auth provider (e.g. auth.example.com) redirects
     * the user after login. The application MUST route incoming requests on
     * this URL to `completeLogin`. This value is typically registered with
     * the auth provider at configuration time.
     */
    readonly callbackUrl: string;

    /**
     * Absolute URL where the auth provider redirects after RP-initiated
     * logout. The application MUST route incoming requests on this URL to
     * `completeLogout`. Registered with the auth provider as the
     * `post_logout_redirect_uri`.
     */
    readonly postLogoutCallbackUrl: string;

    /**
     * Completes the login flow initiated by `buildLoginUrl`. Called by the
     * application's callback route handler when the auth provider redirects
     * the user back to `callbackUrl`.
     *
     * The returned Response MUST:
     * - Redirect to the `returnTo` destination originally passed to `buildLoginUrl`
     *   (typically carried through the OAuth `state` parameter).
     * - Establish the session so that subsequent calls to `getSubject` on
     *   requests from the same client resolve to a non-null Subject. For
     *   cookie-based backends this means a `Set-Cookie` header.
     *
     * On failure (invalid state, expired code, user denied consent, etc.),
     * implementations SHOULD return a redirect to a safe error page rather
     * than throwing, so the application doesn't need a catch-all error
     * handler around the callback route.
     */
    completeLogin(req: Request): Promise<Response>;

    /**
     * Completes the logout flow initiated by `buildLogoutUrl`. Called by the
     * application's callback route handler when the auth provider redirects
     * the user back to `postLogoutCallbackUrl`.
     *
     * The returned Response MUST:
     * - Clear any session cookies previously set by `completeLogin`.
     * - Redirect to the `returnTo` destination originally passed to
     *   `buildLogoutUrl`, falling back to a provider-defined default when
     *   that state is unavailable.
     */
    completeLogout(req: Request): Promise<Response>;
}
