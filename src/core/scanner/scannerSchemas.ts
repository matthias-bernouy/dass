import { Schema } from "../schema/Schema";

export async function scannerSchemas(files: string[]): Promise<Schema[]> {
    const returnedSchemas: Schema[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const module = await import(file + `?update=${Date.now()}`);
        for (const exported of Object.values(module)) {
            if (typeof exported === "function") {
                const result = exported();
                if (result instanceof Schema) {
                    returnedSchemas.push(result);
                } else if (Array.isArray(result) && result.every((r: any) => r instanceof Schema)) {
                    returnedSchemas.push(...result);
                }
            }
        }
    }
    return returnedSchemas;
}