import { Application } from "src/core/Application";



const app = new Application(__dirname);

await app.scan_schemas();
app.build();