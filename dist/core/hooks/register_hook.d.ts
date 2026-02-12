import { Endpoint } from "../endpoint/Endpoint";
export declare function register_hook(hook: HookTypes, target: Endpoint | Endpoint[], cb: (req: DAASRequest) => any): void;
