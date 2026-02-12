import { join, relative } from "path";
import { resources_dir } from "src/utilities/Global";
import { smartCopy } from "src/utilities/smartCopy";
import { get_dass_generated_dir_source, code_generated_dir } from "../ApplicationPaths";
import { Glob } from "bun";
import { cpSync } from "fs";

export function generate_structure(){

    // const glob = new Glob("**/*");

    // const files = Array.from(glob.scanSync({
    //     cwd: join(resources_dir, "c"),
    //     onlyFiles: true,
    //     absolute: true
    // }));

    cpSync(join(resources_dir, "c"), join(code_generated_dir(), "c"), { recursive: true });

    // for (let i = 0; i < files.length; i++) {
    //     smartCopy(files[i]!, join(code_generated_dir(), "c", relative(join(get_dass_generated_dir_source(), "c"), files[i]!)));
    // }

    smartCopy(join(get_dass_generated_dir_source(), "Makefile"), join(code_generated_dir(), "Makefile"));

    smartCopy(
        join(get_dass_generated_dir_source(), "ts", "utilities", "ObjectPool.ts"), 
        join(code_generated_dir(), "ts", "utilities", "ObjectPool.ts")
    );

    smartCopy(
        join(get_dass_generated_dir_source(), "ts", "utilities", "baseDASSRequest.ts"), 
        join(code_generated_dir(), "ts", "utilities", "baseDASSRequest.ts")
    );

    smartCopy(
        join(get_dass_generated_dir_source(), "ts", "application.ts"), 
        join(code_generated_dir(), "ts", "application.ts")
    );

    smartCopy(
        join(get_dass_generated_dir_source(), "ts", "worker.ts"), 
        join(code_generated_dir(), "ts", "worker.ts")
    );
}