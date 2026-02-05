import { create_tx } from "src/lib/native_bridge/dass-transaction";
import { Worker } from "worker_threads";

create_tx();

const iterations = 16_000_000*3;
const workers = []

for (let i = 0; i < 16; i++) {
    workers.push(new Worker(new URL("./worker.ts", import.meta.url).toString()))
}

const start = Bun.nanoseconds();

for (const worker of workers) {

    worker.postMessage("start");
}

const promises = workers.map(worker => {
    return new Promise<void>((resolve) => {
        worker.on("exit", () => {
            console.log("Worker exited");
            resolve();
        })
    })
});

await Promise.all(promises);
const end = Bun.nanoseconds();
const duration = end - start;

// Calcul pour les opérations individuelles par seconde
const opsPerSecond = (iterations * 1_000_000_000) / duration;

console.log(`Durée totale : ${duration / 1000000} ms`);
console.log(`Opérations par seconde : ${opsPerSecond.toLocaleString()} ops/s`);