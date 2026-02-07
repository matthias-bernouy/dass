import { getTSFileInfo } from "src/utilities/getTSFileInfo";
import { Schema } from "../schema/Schema";



export async function scannerSchemas(files: string[]): Promise<Schema[]> {
    const returnedSchemas: Schema[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const module = await import(file);
        const fns = getTSFileInfo(file)?.functions.filter((f: any) => f.returnType === Schema.name || f.returnType === Schema.name + "[]") || [];
        for (let i = 0; i < fns.length; i++) {
            const fn = fns[i];
            const result = module[fn.name]();
            if (result instanceof Schema) {
                returnedSchemas.push(result);
            } else if (Array.isArray(result) && result.every((r: any) => r instanceof Schema)) {
                returnedSchemas.push(...result);
            }
        }
    }
    return returnedSchemas;
}