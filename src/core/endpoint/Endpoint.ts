import { smartFileWriter } from "../../utilities/smartFileWriter";
import { generate_endpoint } from "./generate_endpoint";
import { join } from "path";
import { code_generated_dir } from "../application/ApplicationPaths"

/**
 * @param target The target of the endpoint, e.g. "/users"
 * @param target Target validation: (/^[a-zA-Z0-9\/:_-]+$/)
 * @param methods The methods of the endpoint, e.g. ["GET", "POST", "DELETE", "PATCH", "PUT", "OPTIONS", "HEAD", "CONNECT", "TRACE", "ALL"]
 * 
 */
export class Endpoint{

    private target: HttpTarget;
    private methods: HttpMethod[];

    constructor(target: HttpTarget, methods: HttpMethod[]) {
        this.target = target;
        this.methods = methods;
    }

    getTarget(): HttpTarget {
        return this.target;
    }

    getMethods(): HttpMethod[] {
        return this.methods;
    }

    getFileName(): string {
        let ret = "routes_";
        ret += this.target.replaceAll("/", "_").replaceAll(":", "_").replaceAll("-", "_").replaceAll(" ", "_");
        return ret;
    }

    async write_endpoint_function(): Promise<void> {
        return smartFileWriter(
            join(code_generated_dir(), "ts", "routes", `${this.getFileName()}.ts`),
            await generate_endpoint(this)
        );
    }

    generate_import_statement(): string {
        return `import ${this.getFileName()} from "./routes/${this.getFileName()}";`
    }

    generate_registration_statement(): string {
        return `\t\t\t...${this.getFileName()}(),`
    }

}