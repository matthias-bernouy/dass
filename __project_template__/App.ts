import { Application } from "src/core/Application";

console.log("STARTING APP...")

const app = new Application(__dirname);

await app.scan_schemas();
app.dev();