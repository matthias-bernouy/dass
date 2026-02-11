import type { BunRequest } from "bun";
import { symbols } from "../ffi_methods.raw";
import { baseDASSRequest } from "../utilities/baseDASSRequest";
import type { DAASResponse } from "../server.raw";

export default function endpoint() {
    let ret = {
        "/target": {
            //START_METHODS
            async METHOD(req: Request) {
                const request = await baseDASSRequest(req);
                let response: DAASResponse = {
                    statusCode: 200,
                    body: "Hello World",
                    headers: {}
                };

                //BEFORE_CALL_ENDPOINT with DAASRequest in scope and DAASResponse required to be returned at the end of the function

                const commit_response = symbols.commit_tx(request.transactionID);

                if (!commit_response) {
                    response = {
                        statusCode: 500,
                        body: "Error committing transaction",
                        headers: {
                            "Content-Type": "text/plain",
                            "Content-Length": "Error committing transaction".length.toString()
                        }
                    }
                }
                (async () => {
                    //AFTER_CALL_ENDPOINT with DAASResponse AND DAASRequest in scope
                })();
                return new Response(response.body, { status: response.statusCode, headers: response.headers });
            },
            //END_METHODS
        },
    };

    return ret;
}