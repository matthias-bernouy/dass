import { Application } from "src/core/application/Application";

console.log("STARTING APP...")

const app = new Application(__dirname);

app.dev();
