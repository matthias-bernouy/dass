import type { RunnerInterface } from "./Runner/RunnerInterface";

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

type RunnerConstructor = new (system: Be5System) => RunnerInterface;

export class Be5System {
    private runner: RunnerInterface;
    protected restEndpoints: RestEndpointsType = {};

    constructor(runner: RunnerConstructor){
        this.runner = new runner(this);
    }

    getRestEndpoints(){
        return this.restEndpoints;
    }

    dispatchEvent(){

    }

    register_endpoint(path: string, method: HTTPMethods, cb: HTTPTarget){
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