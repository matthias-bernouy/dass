import { exit } from "process";
import { benchmark_batch_native, test_native } from "src/lib/native_bridge/dass-dlopen";

import { parentPort } from "worker_threads";

parentPort?.on("message", () => {
    benchmark_batch_native(10_000_000);
    exit(0);
})