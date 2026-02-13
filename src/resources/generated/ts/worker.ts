import { Server } from "./server.raw";
import { parentPort } from "worker_threads";

const server = Server();

parentPort?.on("message", (message) => {
  if (message === "terminate") {
    server.stop();
    process.exit(0);
  }
});