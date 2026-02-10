import { existsSync, mkdirSync,  } from "fs";
import { dirname } from "path";

export async function smartFileWriter(filePath: string, content: string) {

        const hashPath = `${filePath}.hash`;
        const currentHash = Bun.hash(content).toString();
        let oldHash = "";

        const dirPath = dirname(filePath);

        if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

        const hashFile = Bun.file(hashPath);
        
        if (await hashFile.exists()) {
            oldHash = await hashFile.text();
        }

        if (currentHash === oldHash && existsSync(filePath)) {
            return;
        }
        
        await Promise.all([
            Bun.write(filePath, content),
            Bun.write(hashPath, currentHash)
        ]);

        return;
}