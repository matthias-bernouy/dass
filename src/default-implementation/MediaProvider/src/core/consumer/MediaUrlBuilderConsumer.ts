import type { ImageFormat, MediaFormatImageOptions, MediaUrlBuilder } from "src/interfaces/Media";


export class MediaUrlBuilderConsumer implements MediaUrlBuilder {

    get imageConfig() {
        return {
            maxWidth:       3840,
            maxHeight:      3840,
            ladderWidths:   [320, 640, 960, 1280, 1920],
            ladderFormats:  ["webp"] as ImageFormat[],
            defaultQuality: 80,
        };
    }

    formatImageUrl(opts: MediaFormatImageOptions): URL {
        const loc = (globalThis as { location?: { origin: string } }).location;
        const origin = loc?.origin ?? "http://localhost";
        const u = new URL(opts.url, origin);
        if (opts.width   !== undefined) u.searchParams.set("w",   String(opts.width));
        if (opts.height  !== undefined) u.searchParams.set("h",   String(opts.height));
        if (opts.fit     !== undefined) u.searchParams.set("fit", opts.fit);
        if (opts.format  !== undefined) u.searchParams.set("fmt", opts.format);
        if (opts.quality !== undefined) u.searchParams.set("q",   String(opts.quality));
        return u;
    }

}