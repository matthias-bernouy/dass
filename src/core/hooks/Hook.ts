import { Endpoint } from "../endpoint/Endpoint";
import { ApplicationObjects } from "../application/ApplicationObjects";

type HookProps = {
    type: HookTypes;
    target: Endpoint | Endpoint[];
    cb: (req: DAASRequest) => any;
}

export class Hook {

    private static cpt: number = 0;
    private props: HookProps;

    constructor(props: HookProps) {
        this.props = props;
    }

    getType(){
        return this.props.type; 
    } 

    getTarget(){
        return this.props.target; 
    }

    getCallback(){
        return this.props.cb; 
    }

    generate_import_statement(){
        const fn = ApplicationObjects.getHookFunction(this.props.cb.name);
        if (!fn){
            throw new Error("The function " + this.props.cb.name + " is not found");
        }
        let ret = fn.getIsDefaultExport() ? `import ${fn.getFnName()}` : `import { ${fn.getFnName()} }`;
        ret += ` from "${fn.getAbsolutePath()}"`;
        return ret;
    }

    generate_call_before_statement(){
        const fn = ApplicationObjects.getHookFunction(this.props.cb.name);
        if (!fn){
            throw new Error("The function " + this.props.cb.name + " is not found");
        }
        const variable = `hook_${fn.getFnName()}_res_${Hook.cpt++}`
        return `
            const ${variable} = ${fn.getFnName()}(request) as any;
            if ( ${variable} ){
                return new Response(
                    ${variable}.body ?? ${variable}.toString(), 
                    { 
                        status: ${variable}.status ?? 200, 
                        headers: ${variable}.headers ?? {}
                    });
            }
        \n`;
    }

    generate_call_after_statement(){
        const fn = ApplicationObjects.getHookFunction(this.props.cb.name);
        if (!fn){
            throw new Error("The function " + this.props.cb.name + " is not found");
        }
        return `${fn.getFnName()}(request);\n`;
    }

}