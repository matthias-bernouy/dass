import { Endpoint } from "src/core/endpoint/Endpoint";

export function AccountEndpoints(): Endpoint[] {
    
    return [
        new Endpoint("/login/:id", ["POST", "GET"]),

        new Endpoint("/register", ["POST", "GET"]),

        new Endpoint("/forgot-password", ["POST", "GET"]),
    ]

}