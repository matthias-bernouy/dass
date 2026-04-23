import type { MediaErrorCode, MediaResponse } from "../../../../../interfaces/Media";
import { redirect } from "../../../../../utilities/html";

/** Tiny helper: wrap a code + message into a `MediaResponse` failure. */
export function err(code: MediaErrorCode, message: string): MediaResponse<never> {
    return { ok: false, error: { code, message } };
}

/**
 * Replaces `{{BASE_PATH}}` tokens in a static HTML template with the runtime
 * prefix. Accepts `unknown` because bun's default typing for `*.html` text
 * imports is `HTMLBundle` rather than `string`, and every caller would
 * otherwise need its own cast.
 */
export function renderPage(html: unknown, ctx: { basePath: string }): string {
    return String(html).replaceAll("{{BASE_PATH}}", ctx.basePath);
}

/**
 * Redirects back to the page that issued the POST (via the `Referer` header,
 * same-origin only) with optional flash params appended. Falls back to
 * `fallback` when no usable referer is present — typically `{prefix}/admin`.
 */
export function redirectWithFlash(req: Request, fallback: string, params: Record<string, string | undefined> = {}): Response {
    let returnTo = fallback;
    const referer = req.headers.get("referer");
    if (referer) {
        try {
            const refUrl = new URL(referer);
            const reqUrl = new URL(req.url);
            if (refUrl.origin === reqUrl.origin) returnTo = refUrl.pathname + refUrl.search;
        } catch { /* ignore parse errors */ }
    }
    const entries = Object.entries(params).filter(([, v]) => v);
    if (entries.length > 0) {
        const sp = new URLSearchParams();
        for (const [k, v] of entries) sp.set(k, v!);
        const sep = returnTo.includes("?") ? "&" : "?";
        returnTo = returnTo + sep + sp.toString();
    }
    return redirect(returnTo);
}

/** Collapse the three accepted upload inputs into a `Uint8Array`. */
export async function toBytes(data: Blob | Uint8Array | ReadableStream<Uint8Array>): Promise<Uint8Array> {
    if (data instanceof Uint8Array) return data;
    if (data instanceof Blob)       return new Uint8Array(await data.arrayBuffer());
    return new Uint8Array(await new Response(data).arrayBuffer());
}

/**
 * Best-effort MIME → coarse `FileType` classifier for anything that isn't
 * an image. Falls back to `"other"` rather than throwing.
 */
export function classifyNonImage(mime: string): "video" | "audio" | "pdf" | "document" | "text" | "archive" | "other" {
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf") return "pdf";
    if (mime.startsWith("text/"))   return "text";
    if (mime === "application/zip" || mime === "application/x-tar") return "archive";
    if (mime.includes("word") || mime.includes("excel") || mime.includes("document")) return "document";
    return "other";
}

/** Matches `"image/*"`, `"*"` wildcards, or exact MIME strings. */
export function mimeAccepted(accepted: string[] | "*", mime: string): boolean {
    if (accepted === "*") return true;
    for (const pattern of accepted) {
        if (pattern === "*" || pattern === mime) return true;
        if (pattern.endsWith("/*") && mime.startsWith(pattern.slice(0, -1))) return true;
    }
    return false;
}

/** Constant-time string equality, used for secret comparison. */
export function constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

/**
 * Rewrite a file's `absoluteURL` to include the scheme/host/port of the
 * incoming request, so clients receive `http://host:port/prefix/file?…`
 * rather than a bare path. No-op for folders and for URLs that are
 * already fully qualified.
 */
export function qualifyItem(item: import("../../../../../interfaces/Media").MediaItem, req: Request): void {
    if (item.type === "folder") return;
    if (/^https?:\/\//i.test(item.absoluteURL)) return;
    item.absoluteURL = new URL(req.url).origin + item.absoluteURL;
}

/** Format a byte count for human display in the admin UI. */
export function formatBytes(n: number): string {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MiB";
    if (n >= 1024)        return (n / 1024).toFixed(1) + " KiB";
    return n + " o";
}
