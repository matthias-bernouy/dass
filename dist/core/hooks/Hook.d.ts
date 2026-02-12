import { Endpoint } from "../endpoint/Endpoint";
type HookProps = {
    type: HookTypes;
    target: Endpoint | Endpoint[];
    cb: (req: DAASRequest) => any;
};
export declare class Hook {
    private static cpt;
    private props;
    constructor(props: HookProps);
    getType(): "before_response" | "after_response";
    getTarget(): Endpoint | Endpoint[];
    getCallback(): (req: DAASRequest) => any;
    generate_import_statement(): string;
    generate_call_before_statement(): string;
    generate_call_after_statement(): string;
}
export {};
