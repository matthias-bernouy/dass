import { IdentityMap } from "./lib/daas-identity-map";
import { Transaction } from "./lib/dass-transaction";


const tx_id = Transaction.create();
const tx_id2 = Transaction.create();

console.log("Created transaction with ID:", tx_id);
console.log("Created transaction with ID:", tx_id2);

console.log(IdentityMap.exists("exampleKey"));

console.log(IdentityMap.link("exampleKey", BigInt(12345), tx_id))

console.log(IdentityMap.exists("exampleKey"));

console.log(Transaction.commit(tx_id));
console.log("Committed transaction with ID:", tx_id);

console.log(IdentityMap.exists("exampleKey"));