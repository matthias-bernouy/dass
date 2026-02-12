


Bun.build({
    entrypoints: [ "src/core/application/Application.ts" ],
    outdir: "dist",
    loader: {
        ".raw.ts": "text",
        ".raw?raw": "text",
        ".raw.ts?raw": "text",
    },
    target: "bun"
})