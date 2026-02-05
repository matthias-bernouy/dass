import { ptr, toArrayBuffer } from "bun:ffi";
import { commit_tx_native, create_tx_native, create_user_native } from "./lib/native_bridge/dass-dlopen";

const fullname =  Buffer.from("John");
const email =  Buffer.from("john.doe@example.com");
console.log("Creating user with email:", email.toString(), "and fullname:", fullname.toString());
console.log("Email length:", email.length, "Fullname length:", fullname.length);


const start = Bun.nanoseconds();
for (let i = 0; i < 1_000_000; i++) {
    const tx_id = create_tx_native();
    create_user_native(ptr(fullname), fullname.length, ptr(email), email.length, tx_id);
    commit_tx_native(tx_id);
}
const end = Bun.nanoseconds();
const duration = end - start;
const opsPerSecond = (1_000_000 * 1_000_000_000) / duration;

console.log(`Durée totale : ${duration} ns`);
console.log(`Opérations par seconde : ${opsPerSecond.toLocaleString()} ops/s`);

/**
 * 
 * typedef struct User {
    DocumentComposedID _id; // generated

    uint32_t email_length; // required
    uint32_t fullname_length; // optional
    uint64_t balance; // generated 0

    uint8_t  raw[]; // calculated
} User;
 */

// Read the user data from the pointer (this part is just illustrative; actual implementation may vary)