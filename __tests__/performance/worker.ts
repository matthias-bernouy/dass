import { exit } from "process";
import { IdentityMap } from "src/lib/native_bridge/daas-identity-map";
import { Transaction } from "src/lib/native_bridge/dass-transaction";

import { workerData, parentPort } from "worker_threads";

const { keys } = workerData;

const iterations = 1_000_000;

parentPort?.on("message", () => {
    for (let i = 0; i < iterations; i++) {
        const tx_id = Transaction.create();
        IdentityMap.link(keys[i], BigInt(i), tx_id);
        Transaction.commit(tx_id);
        IdentityMap.exists(keys[i]);
    }

    exit(0);
})