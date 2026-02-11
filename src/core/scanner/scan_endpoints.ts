import { Endpoint } from "../endpoint/Endpoint";

export async function scan_endpoints(files: string[]): Promise<Endpoint[]> {
    
    const returnedEndpoints: Endpoint[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const module = await import(file + `?update=${Date.now()}`);
        for (const exported of Object.values(module)) {
            if (typeof exported === "function") {
                const result = exported();
                if (result instanceof Endpoint) {
                    returnedEndpoints.push(result);
                } else if (Array.isArray(result) && result.every((r: any) => r instanceof Endpoint)) {
                    returnedEndpoints.push(...result);
                }
            }
        }
    }
    return returnedEndpoints;

}