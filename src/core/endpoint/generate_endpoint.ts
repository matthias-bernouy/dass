import { get_endpoint_template } from "../application/templates";
import { Endpoint } from "./Endpoint";
import { generate_endpoint_hooks } from "./generate_endpoints_hooks";

export async function generate_endpoint(endpoint: Endpoint): Promise<string> {

    let ret = get_endpoint_template();

    // Step get the method template
    const regexToCaptureMethodTemplate = /(\/\/START_METHODS)(.*?)(\/\/END_METHODS)/s;
    let methodTemplate = ret.match(regexToCaptureMethodTemplate)?.[2];
    if (!methodTemplate) {
        throw new Error("Method template not found in endpoint template");
    }
    ret = ret.replace("//START_METHODS", "");
    ret = ret.replace("//END_METHODS", "");


    // Step replace the target
    ret = ret.replace("/target", endpoint.getTarget());


    // Step generate the methods and replace the method template with the generated methods
    let methodsCode = "";
    for (const method of endpoint.getMethods()) {
        let methodCode = methodTemplate;
        methodCode = methodCode
            .replaceAll("METHOD", method)
            .replace("//BEFORE_CALL_ENDPOINT", `//BEFORE_CALL_ENDPOINT_${method}`)
            .replace("//AFTER_CALL_ENDPOINT", `//AFTER_CALL_ENDPOINT_${method}`)
        methodsCode += methodCode + "\n";
    }

    ret = ret.replace(methodTemplate, methodsCode);

    ret = await generate_endpoint_hooks(ret, endpoint);

    return ret
    
}