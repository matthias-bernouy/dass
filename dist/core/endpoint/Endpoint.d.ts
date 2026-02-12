/**
 * @param target The target of the endpoint, e.g. "/users"
 * @param target Target validation: (/^[a-zA-Z0-9\/:_-]+$/)
 * @param methods The methods of the endpoint, e.g. ["GET", "POST", "DELETE", "PATCH", "PUT", "OPTIONS", "HEAD", "CONNECT", "TRACE", "ALL"]
 *
 */
export declare class Endpoint {
    private target;
    private methods;
    constructor(target: HttpTarget, methods: HttpMethod[]);
    getTarget(): HttpTarget;
    getMethods(): HttpMethod[];
    getFileName(): string;
    write_endpoint_function(): Promise<void>;
    generate_import_statement(): string;
    generate_registration_statement(): string;
}
