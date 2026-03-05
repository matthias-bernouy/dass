import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

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
        outdir: "dist"
    })

})()

