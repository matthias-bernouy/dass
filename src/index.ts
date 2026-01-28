import { IdentityMap } from "./lib/native_bridge/daas-identity-map";
import { Transaction } from "./lib/native_bridge/dass-transaction";

const tx_id = Transaction.create();
const tx_id2 = Transaction.create();
const tx_id3 = Transaction.create();
const tx_id4 = Transaction.create();
console.log("Created transaction with ID:", tx_id);
console.log("Created transaction with ID:", tx_id2);
console.log("Created transaction with ID:", tx_id3);
console.log("Created transaction with ID:", tx_id4);

console.log(IdentityMap.exists("exampleKey"));

console.log(IdentityMap.link("exampleKey", BigInt(12345), tx_id));

console.log(IdentityMap.exists("exampleKey"));

Transaction.abort(tx_id);

console.log(IdentityMap.exists("exampleKey"));

// console.log(IdentityMap.unlink("exampleKey", BigInt(0)));

// console.log(IdentityMap.exists("exampleKey"));

// console.log(IdentityMap.exists("exampleKey"));

// console.log(Transaction.commit(tx_id));
// console.log("Committed transaction with ID:", tx_id);

// console.log(IdentityMap.exists("exampleKey"));