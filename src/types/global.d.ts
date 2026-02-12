type _HookTypes = [
    "before_response",
    "after_response"
]

type _Endpoints = [
    "POST | /login:id",
    "GET  | /login:id",
]

type _HTTP_METHODS = [
    "POST",
    "GET",
    "PATCH",
    "PUT",
    "DELETE",
    "OPTIONS"
]

declare global {
    
    type DAASRequest = {
        req: Request;
        queryParams: Record<string, string>;
        pathParams: Record<string, string>;
        data:  Record<string, any>;
    }

    type DAASResponse = {
        status: number;
        body?: string;
        headers?: Record<string, string>;
    } | void;


    type HttpMethod = _HTTP_METHODS[number];
    type HttpTarget = `/${string}`;

    type HookTypes = _HookTypes[number];
    type Endpoints = _Endpoints[number];

}



export {}