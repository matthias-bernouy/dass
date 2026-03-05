import type { Be5System } from "src/Be5System";
import { RunnerInterface } from "./RunnerInterface";
import type { Server } from "bun";

export class BunRunner extends RunnerInterface {

    private server: Server<any> | null = null;

    constructor(system: Be5System){
        super(system);
    }

    start(){
        this.server = Bun.serve({
            routes: this.system.getEndpoints()
        })
    }

    reload(){
        this.server?.reload({
            routes: this.system.getEndpoints()
        })
    }

}