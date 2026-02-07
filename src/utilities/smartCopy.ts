import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export function smartCopy(src: string, dest: string) {
    if (existsSync(dest)) {
        const srcBuf = readFileSync(src);
        const destBuf = readFileSync(dest);
        if (srcBuf.equals(destBuf)) {
            return;
        }
    }
    
    const destDir = path.dirname(dest);
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    writeFileSync(dest, readFileSync(src));
}