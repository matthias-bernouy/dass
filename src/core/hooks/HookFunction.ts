type HookFunctionProps = {
    fnName: string;
    isDefaultExport: boolean;
    absolutePath: string;
}

export class HookFunction {

    private props: HookFunctionProps;

    constructor(props: HookFunctionProps){
        this.props = props;
    }

    getFnName(){
        return this.props.fnName;
    }

    getIsDefaultExport(){
        return this.props.isDefaultExport;
    }

    getAbsolutePath(){
        return this.props.absolutePath;
    }

}