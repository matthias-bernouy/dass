import { BunRunner } from "./Runner/BunRunner";
import { Be5System } from "./Be5System";


const system = new Be5System(BunRunner);

system.register_endpoint("/test", "GET", (req: Request) => {
    return new Response("Hello World")
})

system.start();