type HookFunctionProps = {
    fnName: string;
    isDefaultExport: boolean;
    absolutePath: string;
};
export declare class HookFunction {
    private props;
    constructor(props: HookFunctionProps);
    getFnName(): string;
    getIsDefaultExport(): boolean;
    getAbsolutePath(): string;
}
export {};
