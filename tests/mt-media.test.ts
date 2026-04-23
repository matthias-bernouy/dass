import { beforeEach, describe, expect, test } from "bun:test";

import type { Authentication, Subject } from "../src/Authentication/interfaces/Authentication";
import type { FileMetadata, MediaItemsPage, MediaResponse } from "../src/Media/Media";
import { FakeRunner } from "./helpers/FakeRunner";
import { InMemoryBucketRepository } from "../src/Media/MtMediaProvider/InMemoryBucketRepository";
import { InMemoryBucketMediaStorage } from "../src/Media/MtMediaProvider/InMemoryBucketMediaStorage";
import { MtMediaProvider, type MtMediaBucketInfo } from "../src/Media/MtMediaProvider/MtMediaProvider";
import { MtMediaTokenBroker } from "../src/Media/MtMediaProvider/MtMediaTokenBroker";

const PROVIDER_BASE = "http://provider.test";
const APP_BASE = "http://app.test";

/**
 * Minimal Authentication stub. Tests flip `currentSubject` before dispatch
 * to simulate an admin session, an anonymous visitor, or a non-admin user.
 */
class FakeAuth implements Authentication {
    loginUrl = "/login";
    logoutUrl = "/logout";
    profileUrl = "/me";
    currentSubject: Subject | null = null;
    buildLoginUrl(returnTo: string) { return `${this.loginUrl}?returnTo=${encodeURIComponent(returnTo)}`; }
    buildLogoutUrl(returnTo: string) { return `${this.logoutUrl}?returnTo=${encodeURIComponent(returnTo)}`; }
    async getSubject() { return this.currentSubject; }
}

/**
 * Bridges `fetch(PROVIDER_BASE/*)` and `fetch(APP_BASE/*)` straight into the
 * provider / app FakeRunners, so the Broker can hit the Provider in-process
 * and the Consumer can hit the app's token endpoint.
 */
function installFetchBridge(providers: { base: string; runner: FakeRunner }[]): () => void {
    const real = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input
            : input instanceof URL ? input.toString()
            : input.url;
        for (const { base, runner } of providers) {
            if (url.startsWith(base)) {
                const method = (init?.method ?? "GET").toUpperCase();
                return runner.dispatch(method, url, init);
            }
        }
        throw new Error(`Unstubbed fetch: ${url}`);
    }) as typeof fetch;
    return () => { globalThis.fetch = real; };
}

// ────────────────────────────────────────────────────────────────────────

describe("MtMediaProvider", () => {

    let auth: FakeAuth;
    let buckets: InMemoryBucketRepository;
    let storage: InMemoryBucketMediaStorage;
    let runner: FakeRunner;
    let provider: MtMediaProvider;

    beforeEach(() => {
        auth = new FakeAuth();
        buckets = new InMemoryBucketRepository();
        storage = new InMemoryBucketMediaStorage();
        runner = new FakeRunner();
        runner.group("/mediahub", (r) => {
            provider = new MtMediaProvider(r, {
                admin:   auth,
                buckets,
                storage,
                tokenTtlMs: 50, // short, to test expiry
            });
        });
    });

    // ── admin UI gate ────────────────────────────────────────────────────

    test("admin UI redirects anonymous users to login", async () => {
        const res = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/admin`);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("/login");
    });

    test("admin UI rejects non-admin users with 403", async () => {
        auth.currentSubject = { identifier: "u1", role: "user" };
        const res = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/admin`);
        expect(res.status).toBe(403);
    });

    test("admin UI serves the bucket list to admins", async () => {
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const res = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/admin`);
        expect(res.status).toBe(200);
        expect((await res.text()).toLowerCase()).toContain("buckets");
    });

    // ── bucket creation ─────────────────────────────────────────────────

    test("admin can create a bucket and the secret is shown exactly once", async () => {
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const form = new FormData();
        form.set("name", "cms-a");
        const createRes = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets`, {
            body: form,
        });
        expect(createRes.status).toBe(302);
        const loc = createRes.headers.get("Location")!;
        expect(loc).toContain("newSecret=");
        expect(loc).toContain("newBucketId=");

        const list = await buckets.list();
        expect(list).toHaveLength(1);
        expect(list[0]!.name).toBe("cms-a");

        // Secret is not stored raw
        const secret = decodeURIComponent(loc.match(/newSecret=([^&]+)/)![1]!);
        expect(list[0]!.secretHash).not.toBe(secret);
    });

    // ── mint endpoint ───────────────────────────────────────────────────

    async function createBucket(): Promise<{ id: string; secret: string }> {
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const form = new FormData();
        form.set("name", "cms-a");
        const createRes = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets`, { body: form });
        const loc = createRes.headers.get("Location")!;
        auth.currentSubject = null;
        return {
            id: decodeURIComponent(loc.match(/newBucketId=([^&]+)/)![1]!),
            secret: decodeURIComponent(loc.match(/newSecret=([^&]+)/)![1]!),
        };
    }

    test("POST /mint rejects missing secret", async () => {
        const { id } = await createBucket();
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/mint?bucket=${id}`);
        expect(res.status).toBe(401);
    });

    test("POST /mint rejects wrong secret", async () => {
        const { id } = await createBucket();
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/mint?bucket=${id}`, {
            headers: { "X-Bucket-Secret": "wrong" },
        });
        expect(res.status).toBe(401);
    });

    test("POST /mint returns a token with valid secret", async () => {
        const { id, secret } = await createBucket();
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/mint?bucket=${id}`, {
            headers: { "X-Bucket-Secret": secret },
        });
        expect(res.status).toBe(200);
        const body = await res.json() as { token: string; expiresAt: number };
        expect(body.token.length).toBeGreaterThan(0);
        expect(body.expiresAt).toBeGreaterThan(Date.now());
    });

    test("POST /mint on unknown bucket returns 404", async () => {
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/mint?bucket=unknown`, {
            headers: { "X-Bucket-Secret": "whatever" },
        });
        expect(res.status).toBe(404);
    });

    // ── mutations gated by token ─────────────────────────────────────────

    async function mint(bucketID: string, secret: string): Promise<string> {
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/mint?bucket=${bucketID}`, {
            headers: { "X-Bucket-Secret": secret },
        });
        return (await res.json() as { token: string }).token;
    }

    async function upload(bucketID: string, token: string, name: string, content: string): Promise<Response> {
        const form = new FormData();
        form.set("file", new File([content], name, { type: "text/plain" }));
        return runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/file?bucket=${bucketID}`, {
            headers: { Authorization: `MtMedia ${token}` },
            body: form,
        });
    }

    test("upload without a token returns 401", async () => {
        const { id, secret } = await createBucket();
        const form = new FormData();
        form.set("file", new File(["hi"], "x.txt", { type: "text/plain" }));
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/file?bucket=${id}`, { body: form });
        expect(res.status).toBe(401);
        // secret required unused here
        void secret;
    });

    test("upload with a valid token succeeds and stores the file", async () => {
        const { id, secret } = await createBucket();
        const token = await mint(id, secret);
        const res = await upload(id, token, "hello.txt", "hello world");
        expect(res.status).toBe(200);
        const body = await res.json() as MediaResponse<FileMetadata>;
        expect(body.ok).toBe(true);
        if (body.ok) {
            expect(body.data.name).toBe("hello.txt");
            expect(body.data.size).toBe(11);
            expect(body.data.absoluteURL).toContain(`bucket=${id}`);
        }
    });

    test("token is one-time: the second use returns 401", async () => {
        const { id, secret } = await createBucket();
        const token = await mint(id, secret);
        const first = await upload(id, token, "a.txt", "a");
        expect(first.status).toBe(200);
        const second = await upload(id, token, "b.txt", "b");
        expect(second.status).toBe(401);
    });

    test("token expires past TTL", async () => {
        const { id, secret } = await createBucket();
        const token = await mint(id, secret);
        await new Promise((r) => setTimeout(r, 80)); // tokenTtlMs = 50
        const res = await upload(id, token, "late.txt", "late");
        expect(res.status).toBe(401);
    });

    test("token minted for bucket A is rejected on bucket B", async () => {
        const a = await createBucket();
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const f = new FormData();
        f.set("name", "cms-b");
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets`, { body: f });
        const locB = res.headers.get("Location")!;
        const bID = decodeURIComponent(locB.match(/newBucketId=([^&]+)/)![1]!);
        auth.currentSubject = null;

        const tokenA = await mint(a.id, a.secret);
        const crossRes = await upload(bID, tokenA, "x.txt", "x");
        expect(crossRes.status).toBe(401);
    });

    // ── public reads ────────────────────────────────────────────────────

    test("GET /items is public and scoped to the bucket", async () => {
        const { id, secret } = await createBucket();
        const token = await mint(id, secret);
        await upload(id, token, "public.txt", "hi");

        const list = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/items?bucket=${id}`);
        expect(list.status).toBe(200);
        const body = await list.json() as MediaResponse<MediaItemsPage>;
        expect(body.ok).toBe(true);
        if (body.ok) {
            expect(body.data.items).toHaveLength(1);
            expect(body.data.items[0]!.name).toBe("public.txt");
        }
    });

    test("GET /file returns raw bytes without authentication", async () => {
        const { id, secret } = await createBucket();
        const token = await mint(id, secret);
        const up = await upload(id, token, "public.txt", "hello public");
        const meta = (await up.json() as MediaResponse<FileMetadata>);
        if (!meta.ok) throw new Error("upload failed");

        const fileRes = await runner.dispatch("GET", `${PROVIDER_BASE}${meta.data.absoluteURL.replace(/^https?:\/\/[^/]+/, "")}`);
        expect(fileRes.status).toBe(200);
        expect(await fileRes.text()).toBe("hello public");
    });

    // ── bucket isolation ────────────────────────────────────────────────

    test("items in one bucket are invisible to another bucket", async () => {
        const a = await createBucket();
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const f = new FormData();
        f.set("name", "cms-b");
        const createBRes = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets`, { body: f });
        const bID = decodeURIComponent(createBRes.headers.get("Location")!.match(/newBucketId=([^&]+)/)![1]!);
        auth.currentSubject = null;

        const tokenA = await mint(a.id, a.secret);
        await upload(a.id, tokenA, "only-in-a.txt", "private");

        const listB = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/items?bucket=${bID}`);
        const bodyB = await listB.json() as MediaResponse<MediaItemsPage>;
        expect(bodyB.ok).toBe(true);
        if (bodyB.ok) expect(bodyB.data.items).toHaveLength(0);
    });

    // ── bucket info endpoint (public) ────────────────────────────────────

    test("GET /bucket returns public info", async () => {
        const { id } = await createBucket();
        const res = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/bucket?bucket=${id}`);
        expect(res.status).toBe(200);
        const body = await res.json() as MediaResponse<MtMediaBucketInfo>;
        expect(body.ok).toBe(true);
        if (body.ok) {
            expect(body.data.id).toBe(id);
            expect(body.data.name).toBe("cms-a");
            expect(body.data.maxFileSize).toBe(50 * 1024 * 1024);
            expect(body.data.acceptedMimeTypes).toBe("*");
        }
    });

    test("GET /bucket on unknown id returns 404", async () => {
        const res = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/bucket?bucket=unknown`);
        expect(res.status).toBe(404);
    });

    // ── admin: update bucket ─────────────────────────────────────────────

    test("admin can update bucket name + maxFileSize + acceptedMimeTypes", async () => {
        const { id } = await createBucket();
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const f = new FormData();
        f.set("name", "cms-a-renamed");
        f.set("maxFileSize", "1024");
        f.set("acceptedMimeTypes", "image/png, image/jpeg");
        const res = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets/update?id=${id}`, { body: f });
        expect(res.status).toBe(302);

        const stored = await buckets.getById(id);
        expect(stored?.name).toBe("cms-a-renamed");
        expect(stored?.maxFileSize).toBe(1024);
        expect(stored?.acceptedMimeTypes).toEqual(["image/png", "image/jpeg"]);
    });

    test("bucket acceptedMimeTypes gates uploads", async () => {
        const { id, secret } = await createBucket();
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const f = new FormData();
        f.set("name", "cms-a");
        f.set("acceptedMimeTypes", "image/png");
        await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets/update?id=${id}`, { body: f });
        auth.currentSubject = null;

        const token = await mint(id, secret);
        const res = await upload(id, token, "x.txt", "hi"); // mime = text/plain
        const body = await res.json() as MediaResponse<FileMetadata>;
        expect(body.ok).toBe(false);
        if (!body.ok) expect(body.error.code).toBe("unsupported_mime_type");
    });

    // ── CORS ─────────────────────────────────────────────────────────────

    test("OPTIONS preflight returns CORS headers", async () => {
        const res = await runner.dispatch("OPTIONS", `${PROVIDER_BASE}/mediahub/items`, {
            headers: {
                Origin: "http://app.test",
                "Access-Control-Request-Method":  "POST",
                "Access-Control-Request-Headers": "authorization, content-type",
            },
        });
        expect(res.status).toBe(204);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
        expect(res.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
    });

    test("regular GET responses carry CORS headers when Origin is present", async () => {
        const { id } = await createBucket();
        const res = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/bucket?bucket=${id}`, {
            headers: { Origin: "http://app.test" },
        });
        expect(res.status).toBe(200);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    test("responses without Origin header carry no CORS headers", async () => {
        const { id } = await createBucket();
        const res = await runner.dispatch("GET", `${PROVIDER_BASE}/mediahub/bucket?bucket=${id}`);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    test("explicit CORS allow-list only accepts listed origins", async () => {
        const r2 = new FakeRunner();
        const b2 = new InMemoryBucketRepository();
        const s2 = new InMemoryBucketMediaStorage();
        const a2 = new FakeAuth();
        r2.group("/mediahub", (r) => {
            new MtMediaProvider(r, {
                admin:   a2,
                buckets: b2,
                storage: s2,
                corsAllowedOrigins: ["http://allowed.test"],
            });
        });

        const allowedRes = await r2.dispatch("OPTIONS", `${PROVIDER_BASE}/mediahub/items`, {
            headers: { Origin: "http://allowed.test" },
        });
        expect(allowedRes.headers.get("Access-Control-Allow-Origin")).toBe("http://allowed.test");

        const rejectedRes = await r2.dispatch("OPTIONS", `${PROVIDER_BASE}/mediahub/items`, {
            headers: { Origin: "http://evil.test" },
        });
        expect(rejectedRes.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    // ── bucket deletion wipes storage ───────────────────────────────────

    test("deleting a bucket wipes its items and bytes", async () => {
        const a = await createBucket();
        const tokenA = await mint(a.id, a.secret);
        await upload(a.id, tokenA, "doomed.txt", "bye");

        auth.currentSubject = { identifier: "u1", role: "admin" };
        const del = await runner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets/delete?id=${a.id}`);
        expect(del.status).toBe(302);

        const items = await storage.listItems(a.id);
        expect(items).toHaveLength(0);
        const bucket = await buckets.getById(a.id);
        expect(bucket).toBeNull();
    });
});

// ────────────────────────────────────────────────────────────────────────

describe("MtMediaTokenBroker", () => {

    let providerRunner: FakeRunner;
    let appRunner: FakeRunner;
    let auth: FakeAuth;
    let buckets: InMemoryBucketRepository;
    let storage: InMemoryBucketMediaStorage;
    let provider: MtMediaProvider;
    let unbridge: () => void;

    beforeEach(() => {
        auth = new FakeAuth();
        buckets = new InMemoryBucketRepository();
        storage = new InMemoryBucketMediaStorage();

        providerRunner = new FakeRunner();
        providerRunner.group("/mediahub", (r) => {
            provider = new MtMediaProvider(r, { admin: auth, buckets, storage });
        });

        appRunner = new FakeRunner();

        unbridge = installFetchBridge([
            { base: `${PROVIDER_BASE}/mediahub`, runner: providerRunner },
            { base: `${APP_BASE}/.mediahub`,    runner: appRunner },
        ]);
    });

    // `afterEach` would be cleaner; the test here only installs per test and
    // Bun's test harness does `beforeEach` fresh anyway, so we tear down at
    // the end of each test explicitly.
    function tearDown() { unbridge(); }

    test("broker GET /tokens mints a token via the provider", async () => {
        // Create a bucket
        auth.currentSubject = { identifier: "u1", role: "admin" };
        const form = new FormData();
        form.set("name", "cms-a");
        const res = await providerRunner.dispatch("POST", `${PROVIDER_BASE}/mediahub/admin/buckets`, { body: form });
        const loc = res.headers.get("Location")!;
        const bucketID = decodeURIComponent(loc.match(/newBucketId=([^&]+)/)![1]!);
        const bucketSecret = decodeURIComponent(loc.match(/newSecret=([^&]+)/)![1]!);
        auth.currentSubject = null;

        appRunner.group("/.mediahub", (r) => {
            new MtMediaTokenBroker(r, {
                providerUrl:  `${PROVIDER_BASE}/mediahub`,
                bucketID,
                bucketSecret,
            });
        });

        const mintRes = await appRunner.dispatch("GET", `${APP_BASE}/.mediahub/tokens`);
        expect(mintRes.status).toBe(200);
        const body = await mintRes.json() as { token: string; expiresAt: number };
        expect(body.token.length).toBeGreaterThan(0);

        // The token works for an upload against the provider
        const f = new FormData();
        f.set("file", new File(["z"], "z.txt", { type: "text/plain" }));
        const upload = await providerRunner.dispatch("POST", `${PROVIDER_BASE}/mediahub/file?bucket=${bucketID}`, {
            headers: { Authorization: `MtMedia ${body.token}` },
            body: f,
        });
        expect(upload.status).toBe(200);

        tearDown();
    });

    test("broker GET /tokens returns 502 if the provider rejects the secret", async () => {
        appRunner.group("/.mediahub", (r) => {
            new MtMediaTokenBroker(r, {
                providerUrl:  `${PROVIDER_BASE}/mediahub`,
                bucketID:     "does-not-exist",
                bucketSecret: "nope",
            });
        });

        const mintRes = await appRunner.dispatch("GET", `${APP_BASE}/.mediahub/tokens`);
        expect(mintRes.status).toBe(502);

        tearDown();
    });
});
