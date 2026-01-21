import { AtomicSharedIdentitymap } from "src/lib/AtomicSharedIdentitymap";



const emailIdentity = new AtomicSharedIdentitymap("email");

console.log(emailIdentity.exists("test@example.com"));
emailIdentity.link("test@example.com", 56445)
emailIdentity.link("test@example.com", 56445)
emailIdentity.link("test1@example.com", 56445)
emailIdentity.link("test2@example.com", 56445)
console.log(emailIdentity.exists("test@example.com"));
console.log(emailIdentity.exists("test@example.com"));
emailIdentity.unlink("test1@example.com")
console.log(emailIdentity.count());
