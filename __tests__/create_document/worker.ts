import { ptr } from "bun:ffi";
import { exit } from "process";
import { commit_tx_native, create_tx_native, create_user_native } from "src/lib/native_bridge/dass-dlopen";

import { parentPort } from "worker_threads";

const fullname =  Buffer.alloc(4096);
const email = Buffer.alloc(4096);


parentPort?.on("message", () => {
    for (let i = 0; i < 8_000_000; i++) {
        const nameStr = `John_${i}`;
        const emailStr = `john.${i}@example.com`;

        const nameLen = fullname.write(nameStr); 
        const emailLen = email.write(emailStr);
        const tx_id = create_tx_native();
        //console.log(`Debug TX_ID: ${tx_id.toString(16)}`);
        create_user_native(ptr(fullname), nameLen, ptr(email), emailLen, tx_id);
        commit_tx_native(tx_id);
    }
    exit(0);
})