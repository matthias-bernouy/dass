import type { Authentication, DefaultRole } from "../../../../interfaces/Authentication/Authentication";
import type { BucketRepository } from "../src/interfaces/Bucket";
import type { BucketMediaStorage } from "../src/interfaces/BucketMediaStorage";

/**
 * Public, client-safe view of a bucket. Returned by `GET /bucket` so
 * Consumer apps can self-configure `limits` without holding the secret.
 * `secretHash`, `createdAt` and `updatedAt` are intentionally omitted.
 */
export type MtMediaBucketInfo = {
    id: string;
    name: string;
    maxFileSize: number;
    acceptedMimeTypes: string[] | "*";
};

/** Response shape of `POST /mint`. */
export type MtMediaMintResponse = {
    token: string;
    /** Epoch ms at which the token stops being valid. */
    expiresAt: number;
};

export type MtMediaProviderConfig<Role extends string = DefaultRole> = {
    /**
     * Identity provider gating the admin UI. The subject MUST have
     * `role === adminRole` to create, rotate or delete buckets.
     */
    admin: Authentication<Role>;
    /** Role allowed on the admin UI. Defaults to `"admin"`. */
    adminRole?: Role;
    /** Persistence layer for bucket configurations. */
    buckets: BucketRepository;
    /** Media storage partitioned by bucket. Defaults to `InMemoryBucketMediaStorage`. */
    storage?: BucketMediaStorage;

    /** Default upload cap assigned to new buckets. Defaults to 50 MiB. */
    defaultMaxFileSize?: number;
    /** Default MIME allow-list for new buckets. Defaults to `"*"`. */
    defaultAcceptedMimeTypes?: string[] | "*";

    /** TTL of mutation tokens, in ms. Defaults to 60 000 (1 min). */
    tokenTtlMs?: number;
    /** Max pending tokens kept in memory. Oldest dropped past the cap. Defaults to 10 000. */
    maxPendingTokens?: number;

    /**
     * Origins allowed to call the provider cross-origin. Pass `"*"` to let
     * any origin hit the API (fine for demo / development; medias are
     * public anyway). Pass an explicit allow-list in production so that
     * only your consumer apps can mint tokens and mutate.
     *
     * Applied both to the preflight (`OPTIONS`) responses and to every
     * actual response as `Access-Control-Allow-Origin`. Defaults to `"*"`.
     */
    corsAllowedOrigins?: string[] | "*";
};

/** Internal transform opts parsed from the `/file` query string. */
export type TransformOpts = {
    width?:   number;
    height?:  number;
    fit?:     import("../../../../interfaces/Media").ImageFit;
    format?:  import("../../../../interfaces/Media").ImageFormat;
    quality?: number;
};
