import sharp from "sharp";

import type { ImageFit, ImageFormat } from "../../../../../interfaces/Media";
import type { TransformOpts } from "../../../types/types";

/**
 * Parses the `/file` query string into a `TransformOpts`. All fields are
 * optional; undefined means "leave as-is".
 */
export function parseTransform(url: URL): TransformOpts {
    const w   = url.searchParams.get("w");
    const h   = url.searchParams.get("h");
    const fit = url.searchParams.get("fit") as ImageFit | null;
    const fmt = url.searchParams.get("fmt") as ImageFormat | null;
    const q   = url.searchParams.get("q");
    return {
        width:   w ? parseInt(w, 10) : undefined,
        height:  h ? parseInt(h, 10) : undefined,
        fit:     fit   ?? undefined,
        format:  fmt   ?? undefined,
        quality: q ? parseInt(q, 10) : undefined,
    };
}

/** `true` iff at least one transform knob is set. */
export function hasTransform(t: TransformOpts): boolean {
    return t.width !== undefined || t.height !== undefined
        || t.format !== undefined || t.quality !== undefined
        || t.fit !== undefined;
}

/**
 * Applies a `TransformOpts` to raw image bytes via `sharp` and returns the
 * new bytes + effective MIME. Falls back to webp re-encoding when only
 * `quality` is set; preserves the source format otherwise.
 */
export async function transformImage(
    bytes: Uint8Array,
    t: TransformOpts,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
    let pipe = sharp(bytes);

    if (t.width !== undefined || t.height !== undefined) {
        pipe = pipe.resize({
            width:  t.width,
            height: t.height,
            fit:    t.fit === "contain" ? "contain"
                  : t.fit === "fill"    ? "fill"
                  :                       "cover",
            withoutEnlargement: false,
        });
    }

    const quality = t.quality ?? 80;
    let mimeType: string;

    switch (t.format) {
        case "jpeg": pipe = pipe.jpeg({ quality });      mimeType = "image/jpeg"; break;
        case "png":  pipe = pipe.png ({ quality });      mimeType = "image/png";  break;
        case "webp": pipe = pipe.webp({ quality });      mimeType = "image/webp"; break;
        case "avif": pipe = pipe.avif({ quality });      mimeType = "image/avif"; break;
        default:
            if (t.quality !== undefined) {
                pipe = pipe.webp({ quality });
                mimeType = "image/webp";
            } else {
                mimeType = "image/webp";
            }
    }

    const buf = await pipe.toBuffer({ resolveWithObject: true });
    return {
        bytes:    new Uint8Array(buf.data.buffer, buf.data.byteOffset, buf.data.byteLength),
        mimeType: t.format ? mimeType! : `image/${buf.info.format}`,
    };
}

/**
 * Best-effort probe for image dimensions. Returns `{ width: 0, height: 0 }`
 * when `sharp` can't decode the payload rather than throwing.
 */
export async function readImageDimensions(bytes: Uint8Array): Promise<{ width: number; height: number }> {
    try {
        const meta = await sharp(bytes).metadata();
        return { width: meta.width ?? 0, height: meta.height ?? 0 };
    } catch {
        return { width: 0, height: 0 };
    }
}
