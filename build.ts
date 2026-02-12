import { mkdir, cp } from "node:fs/promises";

(async () => {

    await Bun.build({
        entrypoints: [ "src/index.ts" ],
        outdir: "dist",
        target: "bun",
        loader: {
            ".c": "text"
        }
    })

    await mkdir("dist/src/resources", { recursive: true });
    await cp("src/resources", "dist/src/resources", { recursive: true });

})()

