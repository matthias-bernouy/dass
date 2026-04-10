# @bernouy/socle

Minimal backend "socle" (foundation) for Bun apps. Ships the core platform
interfaces (HTTP runner, authentication, mail) plus ready-to-use default
implementations you can drop in or replace with your own.

> Runtime target: **Bun** (the runner uses `Bun.serve` and HTML pages are
> loaded via Bun's `with { type: "text" }` text-module attribute). It is not
> meant to run under plain Node.

---

## Installation

```bash
bun add @bernouy/socle
```

TypeScript is a peer dependency. Runtime dependencies (`bcryptjs`, `jose`,
`mongodb`, `nodemailer`, `sharp`, `file-type`) are installed automatically.

### Required environment variable

The authentication provider signs and verifies JWTs with HS256 and reads the
secret from `process.env.JWT_SECRET`. You **must** set it before starting the
runner:

```bash
JWT_SECRET=some-long-random-string bun run src/index.ts
```

---

## What's in the box

The package exposes two layers, both re-exported from the root:

```ts
import {
    // Interfaces (pure contracts, no runtime code)
    Runner, RouteHandler, Middleware,
    Authentication, PasswordAuthentication,
    Subject, AccountSummary,
    Mailer, Be5_MailMessage,

    // Default implementations
    Be5_Runner,
    Be5_Authentication, AuthConfig, signAuthJwt,
    AuthRepositoryProvider,
    AuthRepository, TSubject,
    ConsoleMailerProvider,
    SmtpMailerProvider, SmtpMailerConfig,
} from "@bernouy/socle";
```

| Concern | Interface | Default implementation |
|---|---|---|
| HTTP server | `Runner` | `Be5_Runner` (Bun.serve) |
| Authentication (core) | `Authentication` | `Be5_Authentication` |
| Password login / register | `PasswordAuthentication` | `Be5_Authentication` |
| Auth storage | `AuthRepository` | `AuthRepositoryProvider` (MongoDB) |
| Mail | `Mailer` | `ConsoleMailerProvider`, `SmtpMailerProvider` |

You can replace any default by supplying your own implementation of the
matching interface — the `Be5_Authentication` class only depends on
`AuthRepository`, `Runner`, and (optionally) `Mailer`.

---

## Quick start

Wires the runner, a MongoDB-backed repository, a console mailer, and the
authentication provider together.

```ts
import {
    Be5_Runner,
    Authentication,
    AuthRepositoryProvider,
    ConsoleMailerProvider,
} from "@bernouy/socle";

// 1. HTTP runner
const runner = new Be5_Runner();

// 2. Repository (MongoDB)
const repository = await AuthRepositoryProvider.create({
    uri: process.env.MONGO_URI ?? "mongodb://localhost:27017",
    databaseName: "my_app",
});

// 3. Mailer — console for dev, SMTP for prod
const mailer = new ConsoleMailerProvider("no-reply@my-app.local");

// 4. Authentication — the constructor mutates `runner` by registering
//    its own routes under `basePath` (default "/auth").
const auth = new Be5_Authentication(repository, runner, {
    basePath: "/auth",
    baseUrl: "http://localhost:3000",
    defaultRedirection: "/dashboard",
    mailer,                       // optional — omit to disable password reset
    mailFrom: "no-reply@my-app.local",
    resetTokenTtlMinutes: 30,
});

// 5. Your own routes
runner.get("/", () => new Response("Hello"));

runner.get("/dashboard", async (req) => {
    const subject = await auth.getSubject(req);
    return new Response(`Hello ${subject?.identifier} (${subject?.role})`);
}, [auth.requireAuthenticated]);

runner.get("/admin", async () => {
    const accounts = await auth.listAccounts();
    return Response.json(accounts);
}, [auth.requireAdmin]);

runner.start(); // default port 3000
```

Run it with:

```bash
JWT_SECRET=dev-secret MONGO_URI=mongodb://localhost:27017 bun run src/index.ts
```

---

## The runner — `Be5_Runner`

Thin abstraction over `Bun.serve` with route registration, middleware, and
nested groups. Routes are matched by literal segment comparison with `:param`
wildcards. **There is no query-string parsing and no regex matching** — if you
need params, read them from `new URL(req.url)` yourself.

```ts
const runner = new Be5_Runner();

// Verb helpers
runner.get("/users", listUsers);
runner.post("/users", createUser);
runner.put("/users/:id", updateUser);
runner.patch("/users/:id", patchUser);
runner.delete("/users/:id", deleteUser);

// Or the generic form
runner.addEndpoint("GET", "/status", () => new Response("ok"));

// Global middleware (runs before every route)
runner.use(async (req, next) => {
    console.log(req.method, req.url);
    return next();
});

// Per-route middleware (third argument on every helper)
runner.get("/me", meHandler, [auth.requireAuthenticated]);

// Groups — prefix + shared middleware
runner.group("/api/v1", (r) => {
    r.get("/ping", () => new Response("pong"));
    r.post("/things", createThing);
}, [auth.requireAuthenticated]);

runner.start();       // listens on 3000
runner.start(8080);   // or a custom port
```

### Handler signature

```ts
type RouteHandler = (req: Request) => Response | Promise<Response>;
type Middleware   = (req: Request, next: () => Promise<Response>) => Promise<Response>;
```

Handlers receive the native Web `Request` and must return a native `Response`.
Unhandled exceptions inside a handler or middleware bubble up to a generic
`500 Internal Server Error`; a missing route returns `404`.

### Gotchas

- **Nested `group()` currently drops outer middleware onto inner routes.**
  Apply security-critical middleware (admin guards, etc.) directly on the
  route instead of relying on a parent group to enforce it.
- **No query-string or body parsing** — use `new URL(req.url).searchParams`,
  `req.json()`, `req.formData()` as usual on the Web `Request`.

---

## Authentication — `Authentication`

Cookie-based auth using a JWT (HS256) stored in a cookie named
`Be5Credentials`. On construction it registers HTML pages and JSON endpoints
under `basePath` (default `/auth`):

| Route | Purpose |
|---|---|
| `GET  /auth/login` | Login page |
| `POST /auth/loginSubmit` | Login form handler |
| `GET  /auth/register` | Register page (redirects to `/auth/setup` when the DB is empty, 404-like when `registerDisabled: true`) |
| `POST /auth/registerSubmit` | Register form handler |
| `GET  /auth/logout` | Clears the cookie |
| `GET  /auth/setup` | First-run setup page (only reachable while no account exists) |
| `POST /auth/setupSubmit` | Creates the first admin |
| `GET  /auth/recover` | "Forgot password" page (**requires a mailer**, 503 otherwise) |
| `POST /auth/recoverSubmit` | Sends the reset email |
| `GET  /auth/reset` | Reset-password page (via emailed token) |
| `POST /auth/resetSubmit` | Applies the new password |
| `POST /auth/changePasswordSubmit` | Authenticated password change |
| `GET  /auth/admin/accounts` | Admin UI (admin-only) |
| `GET    /auth/admin/api/accounts` | List accounts (admin-only) |
| `POST   /auth/admin/api/accounts` | Create account (admin-only) |
| `DELETE /auth/admin/api/accounts` | Delete account (admin-only) |
| `PATCH  /auth/admin/api/accounts` | Change role (admin-only) |

### Config

```ts
type AuthConfig = {
    basePath?: string;              // default "/auth"
    registerDisabled?: boolean;     // default false
    defaultRedirection?: string;    // default "/"
    baseUrl?: string;               // absolute URL, used to build reset links in emails
    mailer?: Mailer;                // optional; absent disables password reset
    resetTokenTtlMinutes?: number;  // default 30
    mailFrom?: string;              // default From address for auth emails
};
```

### Route URLs as properties

`Authentication` exposes every page path it registers so you don't have to
hardcode them:

```ts
auth.loginPage           // "/auth/login"
auth.registerPage        // "/auth/register"
auth.recoverPage         // "/auth/recover"
auth.resetPage           // "/auth/reset"
auth.logoutPage          // "/auth/logout"
auth.setupPage           // "/auth/setup"
auth.adminAccountsPage   // "/auth/admin/accounts"

// Build a login URL that redirects back after success
auth.withRedirect(auth.loginPage, "/private");
// → "/auth/login?redirect=%2Fprivate"
```

### Guarding routes

You have three tools to protect routes. Pick whichever fits the call site:

```ts
// 1. Middleware form — plug into runner middleware arrays
runner.get("/dashboard", dashboard, [auth.requireAuthenticated]);
runner.get("/admin/foo", adminFoo, [auth.requireAdmin]);

// 2. Imperative guard — throws on failure
async function handler(req: Request) {
    const subject = await auth.guardAuthenticated(req); // or guardAdmin
    return new Response(`Hi ${subject.identifier}`);
}

// 3. Soft check — returns null / boolean
const subject = await auth.getSubject(req);        // Subject | null
const loggedIn = await auth.isAuthenticated(req);  // boolean
```

`Subject` is `{ identifier: string; role: "admin" | "user" }`.

### Programmatic account management

```ts
await auth.listAccounts();                            // AccountSummary[]
await auth.createAccount("a@b.c", "pw", "admin");     // Subject
await auth.deleteAccount("a@b.c");                    // refuses the last admin
await auth.setAccountRole("a@b.c", "user");           // refuses to demote the last admin

await auth.requestPasswordReset("a@b.c");             // throws if no mailer
await auth.resetPassword(token, "newPassword");
await auth.changePassword(req, "oldPw", "newPw");

auth.logout();   // returns a Response that clears the cookie
```

### `mailEnabled`

`auth.mailEnabled` is `true` when a mailer was passed to the constructor.
Password recovery pages return `503` and `requestPasswordReset()` throws when
it is `false` — the login page is automatically stripped of the "forgot
password" link in that case.

---

## Auth storage — `AuthRepository`

`Authentication` depends on a repository that implements this contract
(`src/default/AuthenticationProvider/interfaces/repository/AuthRepository.ts`):

```ts
type TSubject = {
    id?: string;
    email: string;
    passwordHash: string;
    role: "admin" | "user";
    createdAt?: Date;
    passwordResetTokenHash?: string | null;
    passwordResetExpiresAt?: Date | null;
};

interface AuthRepository {
    findByEmail(email: string): Promise<TSubject | null>;
    findByResetTokenHash(tokenHash: string): Promise<TSubject | null>;
    register(subject: TSubject): Promise<TSubject>;
    updatePassword(email: string, passwordHash: string): Promise<void>;
    updateRole(email: string, role: "admin" | "user"): Promise<void>;
    setResetToken(email: string, tokenHash: string, expiresAt: Date): Promise<void>;
    clearResetToken(email: string): Promise<void>;
    delete(email: string): Promise<void>;
    list(): Promise<TSubject[]>;
    count(): Promise<number>;
}
```

### Default implementation: `AuthRepositoryProvider` (MongoDB)

Writes to an `auth` collection in the database you specify. Use the async
factory — the constructor is for when you already hold a `MongoClient`.

```ts
import { AuthRepositoryProvider } from "@bernouy/socle";

const repository = await AuthRepositoryProvider.create({
    uri: "mongodb://localhost:27017",
    databaseName: "my_app",
});
```

### Writing your own repository

Just implement `AuthRepository` and hand the instance to
`new Be5_Authentication(myRepo, runner, config)`. No other wiring needed.

---

## Mail — `Mailer`

Contract:

```ts
type Be5_MailMessage = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;   // overrides the provider default
};

interface Mailer {
    send(message: Be5_MailMessage): Promise<void>;
}
```

### `ConsoleMailerProvider`

Dev/test mailer — prints messages to stdout instead of sending them. Handy
for inspecting password-reset links without configuring SMTP.

```ts
import { ConsoleMailerProvider } from "@bernouy/socle";
const mailer = new ConsoleMailerProvider("no-reply@my-app.local");
```

### `SmtpMailerProvider`

SMTP-backed, built on `nodemailer` (imported dynamically so apps that only
use the console mailer don't pay the cost).

```ts
import { SmtpMailerProvider } from "@bernouy/socle";

const mailer = new SmtpMailerProvider({
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: { user: "xxx", pass: "yyy" },
    defaultFrom: "no-reply@example.com",
});
```

---

## Recipes

### Redirect unauthenticated traffic to the login page

```ts
runner.get("/private", async (req) => {
    if (!(await auth.isAuthenticated(req))) {
        return Response.redirect(auth.withRedirect(auth.loginPage, "/private"), 302);
    }
    return new Response("Private area");
});
```

### Grouping your own API under a shared guard

```ts
runner.group("/api", (r) => {
    // NOTE: apply the guard on each route rather than at the group level —
    // nested-group middleware merging is currently lossy.
    r.get("/me", meHandler, [auth.requireAuthenticated]);
    r.post("/things", createThing, [auth.requireAuthenticated]);
});
```

### Replacing the runner with your own

Implement `Runner` and pass it to `Be5_Authentication`:

```ts
import type { Runner } from "@bernouy/socle";

class MyRunner implements Runner { /* ... */ }

const auth = new Be5_Authentication(repository, new MyRunner(), { /* ... */ });
```

### Issuing your own JWT (e.g. for tests)

```ts
import { signAuthJwt } from "@bernouy/socle";

const token = await signAuthJwt({
    email: "a@b.c",
    sub: "user-id",
    role: "admin",
});
// Attach as a Be5Credentials cookie to authenticate requests.
```

---

## TypeScript notes

- `strict`, `noUncheckedIndexedAccess`, and `verbatimModuleSyntax` are enabled
  by the published types, so consumers must use `import type` for type-only
  imports.
- Interfaces use plain PascalCase names (`Runner`, `Authentication`,
  `Mailer`, ...) and default classes are prefixed `Be5_` or suffixed
  `*Provider`, so implementations don't collide with their contracts.
