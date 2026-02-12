import { register_hook } from "src/core/hooks/register_hook";
import { AccountEndpoints } from "../endpoint/AccountEndpoints";
import BeforeAll from "../hooks/BeforeAll";

export function HookRegistry(){

    register_hook("before_response", AccountEndpoints(), BeforeAll);
    register_hook("after_response", AccountEndpoints(), BeforeAll);

}