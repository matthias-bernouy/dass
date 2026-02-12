import { smartFileWriter } from "src/utilities/smartFileWriter";
import { server_path_generated } from "../ApplicationPaths";
import { get_server_template } from "../templates";
import { ApplicationObjects } from "../ApplicationObjects";

export async function generate_http_server(){

    let template = get_server_template();

    const promises = [];

    const endpoints = ApplicationObjects.getEndpoints();

    let imports_statement = "";
    let registration_statement = "";

    for (const endpoint of endpoints) {
        imports_statement += endpoint.generate_import_statement();
        registration_statement += endpoint.generate_registration_statement();
        promises.push(endpoint.write_endpoint_function());
    }

    template = template
        .replace("//{{ROUTES_IMPORTS}}", imports_statement)
        .replace("//{{ROUTES_CALLS}}", registration_statement);

    promises.push(
        smartFileWriter(
            server_path_generated(),
            template
        ));

    await Promise.all(promises);
    return;
}