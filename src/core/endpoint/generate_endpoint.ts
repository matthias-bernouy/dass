import { Endpoint } from "./Endpoint";
import TEMPLATE_ENDPOINT from "src/.dass-generated/ts/routes/endpoint.raw?raw" with { type: "text" };

export function generate_endpoint(endpoint: Endpoint): string {

    let ret = TEMPLATE_ENDPOINT;

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
        methodCode = methodCode.replaceAll("METHOD", method);
        methodsCode += methodCode + "\n";
    }

    ret = ret.replace(methodTemplate, methodsCode);


    return ret
    
}