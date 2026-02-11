import { Application } from "../Application";
import { join, relative } from "path";
import { library_dir, resources_dir } from "src/utilities/Global";
import { smartCopy } from "src/utilities/smartCopy";

export function generate_structure(application: Application){

    const glob = application.getGlob();

    const files = Array.from(glob.scanSync({
        cwd: join(resources_dir, "c"),
        onlyFiles: true,
        absolute: true
    }));

    for (let i = 0; i < files.length; i++) {
        smartCopy(files[i]!, join(Application.code_generated_dir, "c", relative(join(resources_dir, "c"), files[i]!)));
    }

    smartCopy(join(library_dir, "src", ".dass-generated", "Makefile"), join(Application.code_generated_dir, "Makefile"));
    smartCopy(join(library_dir, "src", ".dass-generated", "ts", "utilities", "ObjectPool.ts"), join(Application.code_generated_dir, "ts", "utilities", "ObjectPool.ts"));
}