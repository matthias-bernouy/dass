import type { RunnerInterface } from "./runner/RunnerInterface";

type HTTPMethodsEnum = [
    "POST",
    "GET",
    "PATCH"
]

type HTTPMethods = HTTPMethodsEnum[number];
type HTTPTarget = (req: Request) => Response | Promise<Response> | any;

export type RestEndpointsType = {
    [path: string]: {
        [method in HTTPMethods]?: HTTPTarget
    },
}

export type RunnerConstructor = new (system: Be5System) => RunnerInterface;

export class Be5System {
    private runner: RunnerInterface;
    protected restEndpoints: RestEndpointsType = {};

    constructor(runner: RunnerConstructor){
        this.runner = new runner(this);
    }

    getEndpoints(){
        return this.restEndpoints;
    }

    dispatchEvent(){

    }

    registerEndpoint(path: string, method: HTTPMethods, cb: HTTPTarget){
        if (!this.restEndpoints[path]) {
            this.restEndpoints[path] = {};
        }
        
        this.restEndpoints[path][method] = cb;

        this.runner.reload();
    }

    start(){
        this.runner.start();
    }

}