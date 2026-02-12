import { HookFunction } from "../hooks/HookFunction";

export async function scan_hook_functions(files: string[]): Promise<HookFunction[]> {
    
    const ret: HookFunction[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const module = await import(file + `?update=${Date.now()}`);
        for ( const fn of Object.values(module) ){
            if ( typeof(fn) != "function" ) continue;
            const isDefaultExport = fn == module.default
            ret.push(new HookFunction({
                fnName: fn.name,
                isDefaultExport: isDefaultExport,
                absolutePath: file
            }))
        }
    }

    return ret;

}