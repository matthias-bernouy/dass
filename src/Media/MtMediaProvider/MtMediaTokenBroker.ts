import type { Runner } from "../../Runner/Runner";

export type MtMediaTokenBrokerConfig = {
    /**
     * Absolute URL where `MtMediaProvider` is mounted, e.g.
     * `https://mediahub.example.com/mediahub`. Used to hit `/mint`.
     */
    providerUrl: string;

    /** Bucket this app owns. */
    bucketID: string;

    /**
     * Shared secret printed once by the admin UI when the bucket was
     * created or rotated. Never sent to the browser — only to the Provider
     * via `X-Bucket-Secret`.
     */
    bucketSecret: string;

    /** Timeout applied to mint calls, in ms. Defaults to 5 000. */
    requestTimeoutMs?: number;
};

/**
 * App-side companion that holds the shared bucket secret and exposes a
 * local endpoint minting one-time mutation tokens for the browser-side
 * `MtMediaConsumer`.
 *
 * Mount inside a group whose prefix matches the Consumer's `tokenUrl`,
 * e.g. `runner.group("/.mediahub", (r) => new MtMediaTokenBroker(r, cfg))`
 * registers `GET /.mediahub/tokens`.
 *
 * Protect the containing group with whatever auth the app normally uses
 * (session cookie, middleware, …). The broker itself does not enforce
 * authentication — anyone who can reach the endpoint can mint tokens for
 * the bucket.
 */
export class MtMediaTokenBroker {

    private readonly _providerUrl: string;
    private readonly _bucketID: string;
    private readonly _bucketSecret: string;
    private readonly _requestTimeoutMs: number;

    constructor(runner: Runner, config: MtMediaTokenBrokerConfig) {
        this._providerUrl = config.providerUrl.replace(/\/+$/, "");
        this._bucketID = config.bucketID;
        this._bucketSecret = config.bucketSecret;
        this._requestTimeoutMs = config.requestTimeoutMs ?? 5_000;

        runner.get("/tokens", () => this._mint());
    }

    /** Exposed for in-process callers that want to mint without going through HTTP. */
    async mint(): Promise<{ token: string; expiresAt: number } | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this._requestTimeoutMs);
        try {
            const res = await fetch(`${this._providerUrl}/mint?bucket=${encodeURIComponent(this._bucketID)}`, {
                method: "POST",
                headers: {
                    "X-Bucket-Secret": this._bucketSecret,
                    Accept: "application/json",
                },
                signal: controller.signal,
            });
            if (!res.ok) return null;
            const body = await res.json() as { token?: string; expiresAt?: number };
            if (typeof body.token !== "string" || typeof body.expiresAt !== "number") return null;
            return { token: body.token, expiresAt: body.expiresAt };
        } catch {
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    private async _mint(): Promise<Response> {
        const result = await this.mint();
        if (!result) {
            return Response.json({ error: "mint_failed" }, { status: 502 });
        }
        return Response.json(result);
    }
}
