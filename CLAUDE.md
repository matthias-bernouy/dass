# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@bernouy/socle` is a TypeScript library distributed as a Bun-built Node bundle. It defines the core interfaces of the Be5 platform (runner, authentication, mailer) plus default implementations that consumers can use directly or replace with their own.

The package is consumed as `import ... from "@bernouy/socle"` — `package.json` exposes `dist/index.js` / `dist/index.d.ts` via `exports`. `bcryptjs`, `jose`, `mongodb`, and `nodemailer` are runtime dependencies; TypeScript is a peer dependency.

## Commands

- `bun run bun:build` — clean `dist/`, run `tsc` for type-check + `.d.ts` emission, then `Bun.build` to bundle `src/index.ts` into `dist/` (target: node). Runs `build.ts` at the repo root.
- `bunx tsc --noEmit` — type-check only.
- `JWT_SECRET=dev-secret bun examples/app.ts` — run the demo wiring in `examples/app.ts` (requires a local MongoDB).

There is no test runner, lint config, or dev/watch script wired up in `package.json`.

## Architecture

One folder per domain under `src/`, each holding both the contract (interface) and the reference implementation. `src/index.ts` re-exports everything.

1. **`src/Runner/`**
   - `Runner.ts` — interface: HTTP server abstraction (`addEndpoint`, `use`, `group`, verb helpers, `start`) plus `RouteHandler` and `Middleware` types built on the Web `Request`/`Response` API.
   - `DefaultRunner.ts` — `DefaultRunner implements Runner`, backed by `Bun.serve`. Groups compose middleware and prefix via a scoped proxy object. Path matching is a simple segment comparison with `:param` wildcards (no regex, no query parsing); trailing slashes are normalized.

2. **`src/Authentication/`**
   - `Subject.ts` — `Subject` (`identifier`, `role`) and `AccountSummary` (adds `createdAt`).
   - `Authentication.ts` — core auth contract: subject/guards/middlewares, `logout`, and admin account management. Strategy-agnostic.
   - `PasswordAuthentication.ts` — capability: `createAccount`, `changePassword`, `requestPasswordReset`, `resetPassword`, plus the `loginPage`/`registerPage`/`recoverPage`/`resetPage`/`setupPage` string paths and `mailEnabled`.
   - `TokenAuthentication.ts` — capability: opaque API tokens (`createToken`, `listTokens`, `deleteToken`, `tokenAuthHeaders`, `tokensPage`).
   - `AuthRepository.ts` — storage contract (`findByEmail`, `register`, `count`, token CRUD, ...) plus the `TSubject` and `TAuthToken` shapes.
   - `DefaultAuthentication.ts` — `DefaultAuthentication implements Authentication, PasswordAuthentication, TokenAuthentication`. On construction it registers its own routes onto an injected `Runner` under `config.basePath` (default `/auth`). JWT is signed/verified with `jose` (HS256); `JWT_SECRET` is read from `process.env` at construction and the class throws if it is missing. Login/register HTML pages are imported at build time via Bun's `with { type: "text" }` text-module attribute and have a `const defaultRedirect = "/";` placeholder replaced with a `JSON.stringify`-escaped value. Session cookies are issued and cleared via `issueSessionCookie` / `clearSessionCookie`, which respect the `cookieSecure` config (auto-detected from `baseUrl`: `https://` → `Secure`, `http://` → not).
   - `DefaultAuthRepository.ts` — MongoDB-backed implementation of `AuthRepository`; `DefaultAuthRepository.create({ uri, databaseName })` is the async factory.
   - `api/`, `pages/`, `utilities/` — route handlers, text-imported HTML pages, and small helpers (e.g. `sendHtml`) consumed by `DefaultAuthentication`.

3. **`src/Mailer/`**
   - `Mailer.ts` — `Mailer` interface + `MailMessage`.
   - `DefaultConsoleMailer.ts` — dev-only mailer that logs messages to stdout.
   - `DefaultSmtpMailer.ts` — SMTP mailer built on `nodemailer` (imported dynamically so users of the console mailer don't pay the load cost).

Key architectural points that are not obvious from a single file:

- **Capability interfaces, not one god interface**: the core `Authentication` contract only covers what every auth strategy needs (subject, guards, logout, admin). Strategy-specific features live in sibling capability interfaces (`PasswordAuthentication`, `TokenAuthentication` today; `OAuthAuthentication` planned). A provider implements whichever capabilities it supports and consumers type against `Authentication & PasswordAuthentication` when they need password flows.
- **Naming convention**: interfaces are plain PascalCase (`Runner`, `Authentication`, `Mailer`). Default implementations live in the same folder, prefixed `Default` (`DefaultRunner`, `DefaultAuthentication`, `DefaultConsoleMailer`) to avoid colliding with their contracts and to signal at call sites that the class is replaceable.
- **The runner is injected into the auth provider**, not the other way around. `new DefaultAuthentication(repo, runner, config)` mutates the runner by calling `runner.group(...)`. Any new default provider that exposes HTTP routes should follow this same pattern.
- **HTML pages live next to the provider** (`Authentication/pages/*.page.html`) and are imported as text modules. This only works under Bun; if you ever need to run under plain Node you will need a loader shim.
- **`DefaultRunner.group` uses a scoped proxy object**, not a sub-runner class. When adding runner features, remember to also expose them on the scoped object returned inside `group`, otherwise nested groups will silently lose the new capability.
- **URL paths use string concatenation**, never `node:path.join` — `join` produces backslashes on Windows and would silently break route matching. The runner exposes a small `urlJoin` helper internally.
- **`noUncheckedIndexedAccess` and `strict` are on** in `tsconfig.json`, and `verbatimModuleSyntax` is enforced — always use `import type` for type-only imports.

## Examples

`examples/app.ts` wires up the full stack (runner + MongoDB repository + console mailer + auth provider). It lives outside `src/` so it is not compiled into `dist/`. Run it with `JWT_SECRET=dev-secret bun examples/app.ts`.
