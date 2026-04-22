import type { Authentication, DefaultRole, Subject } from "../interfaces/Authentication";
import type { Runner } from "../../Runner/Runner";
import { escapeHtml, htmlResponse } from "../../utilities/html";

export type DevConsumerConfig<Role extends string = DefaultRole> = {
    /** Hardcoded subject returned by `getSubject` for every request. */
    subject: Subject<Role>;

    /** Path prefix for the info pages. Defaults to `/auth/dev`. */
    basePath?: string;
};

/**
 * Static `Authentication<Role>` that always resolves to the configured
 * `Subject`, regardless of cookies or headers. Meant for local development
 * when you want to skip real authentication and pretend to be a specific
 * user / role.
 *
 * ⚠️ NEVER wire this up in production. Placing it as the last child of a
 * `CompositeAuthentication` effectively disables all authentication — every
 * request becomes authenticated as the configured subject.
 *
 * Registers a single `GET ${basePath}/info` route used as the target of
 * `loginUrl` / `logoutUrl` / `profileUrl`. The page just shows "you are X"
 * with a banner warning about dev mode.
 */
export class DevConsumer<Role extends string = DefaultRole> implements Authentication<Role> {

    readonly loginUrl: string;
    readonly logoutUrl: string;
    readonly profileUrl: string;

    private readonly _subject: Subject<Role>;
    private readonly _basePath: string;

    constructor(runner: Runner, config: DevConsumerConfig<Role>) {
        this._subject = config.subject;
        this._basePath = stripTrailingSlash(config.basePath ?? "/auth/dev");

        this.loginUrl = `${this._basePath}/info`;
        this.logoutUrl = `${this._basePath}/info`;
        this.profileUrl = `${this._basePath}/info`;

        runner.group(this._basePath, (r) => {
            r.get("/info", (req) => this._infoPage(req));
        });
    }

    buildLoginUrl(returnTo: string): string {
        return `${this.loginUrl}?returnTo=${encodeURIComponent(returnTo)}`;
    }

    buildLogoutUrl(returnTo: string): string {
        return `${this.logoutUrl}?returnTo=${encodeURIComponent(returnTo)}`;
    }

    async getSubject(_req: Request): Promise<Subject<Role> | null> {
        return this._subject;
    }

    private _infoPage(req: Request): Response {
        const url = new URL(req.url);
        const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo") ?? "", "/");
        const displayName = escapeHtml(this._subject.displayName ?? this._subject.identifier);
        const role = escapeHtml(this._subject.role);

        return htmlResponse(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Dev mode — connecté</title>
<style>
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 3rem auto; padding: 0 1rem; color: #1a1a1a; }
    .banner { background: #fff4e5; border: 1px solid #f5c97f; padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1rem; }
    .banner strong { color: #b38000; }
    .card { border: 1px solid #e5e5e5; padding: 1rem; border-radius: 6px; }
    code { background: #f7f7f7; padding: 0.1rem 0.3rem; border-radius: 3px; }
    a button { padding: 0.5rem 1rem; cursor: pointer; border: 1px solid #ccc; background: #fff; border-radius: 4px; }
</style>
</head>
<body>
<div class="banner">
    <strong>⚠️ Dev mode</strong> — authentification statique, AUCUN check.
    Toute requête est traitée comme si elle venait de l'utilisateur ci-dessous.
    À ne JAMAIS utiliser en production.
</div>
<h1>Connecté</h1>
<div class="card">
    <p>Identifier : <code>${escapeHtml(this._subject.identifier)}</code></p>
    <p>Display name : <strong>${displayName}</strong></p>
    <p>Rôle : <code>${role}</code></p>
</div>
<p><a href="${escapeHtml(returnTo)}"><button type="button">Retour</button></a></p>
</body>
</html>`);
    }
}

// ── helpers ──────────────────────────────────────────────────────────────

function stripTrailingSlash(s: string): string {
    return s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s;
}

function sanitizeReturnTo(candidate: string, fallback: string): string {
    if (!candidate) return fallback;
    if (!candidate.startsWith("/")) return fallback;
    if (candidate.startsWith("//")) return fallback;
    return candidate;
}
