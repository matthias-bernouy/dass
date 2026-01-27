import { test, expect } from "bun:test";
import { IdentityMap } from "src/lib/daas-identity-map";
import { Transaction } from "src/lib/dass-transaction";
import { Worker } from "worker_threads"

test("performance test placeholder", async () => {

    const iterations = 1000000;
    const keys = [];
    for (let i = 0; i < 1100000; i++) {
        keys.push(`key_${i}`);
    }


    const workers = []

    for (let i = 0; i < 1; i++) {
        workers.push(new Worker(new URL("./worker.ts", import.meta.url).toString(), {
            workerData: {
                keys,
            },
        }))
    }

    const start = Bun.nanoseconds();

    for (const worker of workers) {
        worker.postMessage("start");
    }

    const promises = workers.map(worker => {
        return new Promise<void>((resolve) => {
            worker.on("exit", () => {
                resolve();
            })
        })
    });

    await Promise.all(promises);
    const end = Bun.nanoseconds();
    const duration = end - start;

    // Calcul pour les opérations individuelles par seconde
    const opsPerSecond = (iterations * 1_000_000_000) / duration;

    console.log(`Durée totale : ${duration} ns`);
    console.log(`Opérations par seconde : ${opsPerSecond.toLocaleString()} ops/s`);
}, { timeout: 300000 });