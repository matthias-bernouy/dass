import { existsSync } from "node:fs";
import { mkdir, cp, rm, exists } from "node:fs/promises";

(async () => {

    if ( existsSync("dist/") ){
        await rm("dist/", {
            recursive: true,
            force: true
        });
    }

    Bun.spawnSync(["bun", "run", "generate-types"]);

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

