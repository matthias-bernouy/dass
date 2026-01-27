import { IdentityMap } from "./lib/daas-identity-map";
import { Transaction } from "./lib/dass-transaction";

console.log(IdentityMap.exists("exampleKey"));

console.log(IdentityMap.link("exampleKey", BigInt(12345), BigInt(0)));

console.log(IdentityMap.exists("exampleKey"));

console.log(IdentityMap.unlink("exampleKey", BigInt(0)));

console.log(IdentityMap.exists("exampleKey"));

// console.log(IdentityMap.exists("exampleKey"));

// console.log(Transaction.commit(tx_id));
// console.log("Committed transaction with ID:", tx_id);

// console.log(IdentityMap.exists("exampleKey"));