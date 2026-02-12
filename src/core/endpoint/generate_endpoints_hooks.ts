import type { Endpoint } from "./Endpoint";
import { ApplicationObjects } from "../application/ApplicationObjects";

export async function generate_endpoint_hooks(
    template: string,
    endpoint: Endpoint
){

    let importHookStatement = new Set<string>();
    const hooks = ApplicationObjects.getHooks();

    for ( const method of endpoint.getMethods()){
        let beforeHooksCode = "";
        let afterHooksCode = "";

        for (const hook of hooks) {
            for ( const target of [hook.getTarget()].flat() ) {
                if (target.getTarget() != endpoint.getTarget()) continue;
                
                if (hook.getType() === "before_response") {
                    beforeHooksCode += hook.generate_call_before_statement();
                }

                if (hook.getType() === "after_response") {
                    afterHooksCode += hook.generate_call_after_statement();
                }

                importHookStatement.add(hook.generate_import_statement());
            }
        }

        template = template
            .replace(
                `//BEFORE_CALL_ENDPOINT_${method}`, 
                beforeHooksCode
            )
            .replace(
                `//AFTER_CALL_ENDPOINT_${method}`, 
                afterHooksCode
            )
    }

    const arrayImports = Array.from(importHookStatement);

    template = template.replace(
        `//IMPORT_HOOKS`,
        arrayImports.join("")
    )

    return template;

}