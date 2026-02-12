import type { BunRequest } from "bun";
import { symbols } from "../ffi_methods.raw";
import { baseDASSRequest } from "../utilities/baseDASSRequest";
//IMPORT_HOOKS

export default function endpoint() {
    let ret = {
        "/target": {
            //START_METHODS
            async METHOD(req: BunRequest) {
                const request: DAASRequest = await baseDASSRequest(req);
                let response: DAASResponse = {
                    status: 200,
                    body: "HELLO WORLDDDD",
                    headers: {}
                };

                //BEFORE_CALL_ENDPOINT

                const commit_response = symbols.commit_tx(request.data.transactionID);

                if (!commit_response) {
                    response = {
                        status: 500,
                        body: "Error committing transaction",
                        headers: {
                            "Content-Type": "text/plain",
                            "Content-Length": "Error committing transaction".length.toString()
                        }
                    }
                }
                (async () => {
                    //AFTER_CALL_ENDPOINT
                })();
                return new Response(response.body, { status: response.status, headers: response.headers });
            },
            //END_METHODS
        },
    };

    return ret;
}