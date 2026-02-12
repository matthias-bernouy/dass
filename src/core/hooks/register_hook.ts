import { ApplicationObjects } from "../application/ApplicationObjects";
import { Endpoint } from "../endpoint/Endpoint";
import { Hook } from "./Hook";

export function register_hook(hook: HookTypes, target: Endpoint | Endpoint[], cb: (req: DAASRequest) => any) {
    ApplicationObjects.register_hook(
        new Hook({
            type: hook,
            target: target,
            cb: cb
        })
    )
}

