import Bun, { spawnSync } from "bun";
import { mkdirSync, rmSync } from "fs";

const outDir = `${__dirname}/dist`;
const typesDir = `${outDir}/types`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(typesDir, { recursive: true });

await Bun.build({
	entrypoints: [`${__dirname}/src/index.ts`],
	outdir: `${__dirname}/dist`,
	target: "bun",
	format: "cjs",
	minify: false,
});

console.log("Génération des types...");

spawnSync([
	"bun",
	"x",
	"tsc",
	"src/index.ts",
	"--declaration",
	"--emitDeclarationOnly",
	"--noEmit",
	"false",
	"--outDir",
	`${__dirname}/dist/types`,
	"--moduleResolution",
	"bundler",
	"--target",
	"ESNext",
	"rootDir",
	"src/",
]);

console.log("Build terminé avec succès !");
