import { expect } from "bun:test";
import { exists } from "fs/promises";
import { exit } from "process";
import { exists_idmap, link_idmap } from "src/lib/native_bridge/daas-identity-map";
import { commit_tx, create_tx } from "src/lib/native_bridge/dass-transaction";

import { workerData, parentPort } from "worker_threads";

const { keys } = workerData;

const iterations = 1_000_000;

parentPort?.on("message", () => {
    for (let i = 0; i < iterations; i++) {
        const tx_id = create_tx();
        link_idmap(keys[i], BigInt(i), tx_id);
        exists_idmap(keys[i]);
        commit_tx(tx_id);
    }

    exit(0);
})