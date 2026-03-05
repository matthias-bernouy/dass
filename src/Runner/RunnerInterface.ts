import type { Be5System } from "../Be5System";



export abstract class RunnerInterface{

    protected system: Be5System;

    constructor(system: Be5System){
        this.system = system
    }

    abstract reload(): void;
    abstract start(): void;

}