export function AccountEndpoints(): EndPoint[] {
    
    return [
        new Endpoint("/login/:id", ["POST", "GET"]),

        new Endpoint("/register", ["POST", "GET"]),

        new Endpoint("/forgot-password", ["POST", "GET"]),
    ]

}