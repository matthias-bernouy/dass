# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`be5-interfaces` is a TypeScript library distributed as a Bun-built Node bundle. It defines the core interfaces of the Be5 platform (runner, authentication, media) plus default implementations that consumers can use directly or replace with their own.

The package is consumed as `import ... from "be5-interfaces"` — `package.json` exposes `dist/index.js` / `dist/index.d.ts` via `exports`. `bcryptjs`, `jose`, `mongodb`, `sharp`, and `file-type` are runtime dependencies; TypeScript is a peer dependency.

## Commands

- `bun run bun:build` — clean `dist/`, run `tsc` for type-check + `.d.ts` emission, then `Bun.build` to bundle `src/index.ts` into `dist/` (target: node). Runs `build.ts` at the repo root.
- `tsc --noEmit` — type-check only (tsconfig is configured with `emitDeclarationOnly: true`, so plain `tsc` emits declarations).

There is no test runner, lint config, or dev/watch script wired up in `package.json`.

## Architecture

Two layers, both re-exported from `src/index.ts`:

1. **`src/interfaces/`** — pure TypeScript contracts with no runtime code:
   - `RunnerInterface.ts` — `IBe5_Runner` (HTTP server abstraction: `addEndpoint`, `use`, `group`, verb helpers, `start`) plus `RouteHandler` and `Middleware` types built on the Web `Request`/`Response` API.
   - `AuthInterface.ts` — `IBe5_Authentication` and `IBe5_Subject` (`identifier`, `role`).
   - `MediaInterface` is re-exported from `src/index.ts` but the file does not yet exist on this branch — expect to add it when touching media.

2. **`src/default/`** — reference implementations of those interfaces:
   - `RunnerProvider.ts` — `Be5_Runner implements IBe5_Runner`, backed by `Bun.serve`. Groups compose middleware and prefix via a scoped proxy object. Path matching is a simple segment comparison with `:param` wildcards (no regex, no query parsing).
   - `AuthenticationProvider/Authentication.ts` — `Authentication implements IBe5_Authentication`. On construction it registers its own routes onto an injected `IBe5_Runner` under `config.basePath` (default `/auth`): `login`, `register`, `loginSubmit`, `registerSubmit`. JWT is verified with `jose` (HS256) from the `Be5Credentials` cookie; `JWT_SECRET` comes from `process.env`. Login/register HTML pages are imported at build time via Bun's `with { type: "text" }` text-module attribute and have a `defaultRedirect` placeholder string-replaced at construction.
   - `AuthenticationProvider/interfaces/repository/AuthRepository.ts` — the storage contract (`findByEmail`, `register`, `count`) plus the `TSubject` shape.
   - `AuthenticationProvider/interfaces/default-provider/AuthRepositoryProvider.ts` — MongoDB-backed implementation of `AuthRepository`; `AuthRepositoryProvider.create({ uri, databaseName })` is the async factory.

Key architectural points that are not obvious from a single file:

- **The runner is injected into the auth provider**, not the other way around. `new Authentication(repo, runner, config)` mutates the runner by calling `runner.group(...)`. Any new default provider that exposes HTTP routes should follow this same pattern.
- **HTML pages live next to the provider** (`pages/*.page.html`) and are imported as text modules. This only works under Bun; if you ever need to run under plain Node you will need a loader shim.
- **`Be5_Runner.group` uses a scoped proxy object**, not a sub-runner class. When adding runner features, remember to also expose them on the scoped object returned inside `group`, otherwise nested groups will silently lose the new capability.
- **`noUncheckedIndexedAccess` and `strict` are on** in `tsconfig.json`, and `verbatimModuleSyntax` is enforced — always use `import type` for type-only imports.

## Branch context

The current branch is `Simplify`. Recent deletions (`Be5System.ts`, `src/runner/BunRunner.ts`, old `src/response/send_*`) are a refactor toward the two-layer `interfaces/` + `default/` structure described above. Expect in-flight inconsistencies (e.g. the `MediaInterface` export with no file) while this is in progress.
