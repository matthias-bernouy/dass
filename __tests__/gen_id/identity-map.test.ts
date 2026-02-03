import { init_schema_shards_counters_native, test_native } from "src/lib/native_bridge/dass-dlopen";
import { Worker } from "worker_threads";

    init_schema_shards_counters_native();
    test_native();

    const iterations = 80_000_000;
    const workers = []

    for (let i = 0; i < 8; i++) {
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