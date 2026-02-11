import SERVER_TEMPLATE from "src/.dass-generated/ts/server.raw?raw" with { type: "text" };
import { Application } from "../Application";
import { smartFileWriter } from "src/utilities/smartFileWriter";
import { join } from "path";

export async function generate_http_server(application: Application){

    let template = SERVER_TEMPLATE;

    const promises = [];

    const endpoints = await application.scan_endpoints();

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
            join(Application.code_generated_dir, "ts", "server.ts"),
            template
        ));

    await Promise.all(promises);
    return;
}