import type { BunRequest } from "bun";
import { symbols } from "../ffi_methods.raw";
import type { DAASRequest } from "../server.raw";
import { bufferPool4096bytes } from "../utilities/ObjectPool";
import { Pointer, read } from "bun:ffi";

const baseDAASRequest = async (req: BunRequest): Promise<DAASRequest> => {
    const jsonParams = await req.json().catch(() => ({})) as Record<string, string>;
    const queryParams = {} as Record<string, string>;
    const buf = Buffer.alloc(16);

    if (req.params.id) {
        const idStr = req.params.id;
        buf.writeBigUInt64LE(BigInt("0x" + idStr.substring(0, 16)), 0);
        buf.writeUInt16LE(parseInt(idStr.substring(16, 20), 16), 8);
        buf.writeUInt32LE(parseInt(idStr.substring(20, 28), 16), 10);
        buf.writeUInt16LE(parseInt(idStr.substring(28, 32), 16), 14);
        if (idStr.length !== 32) {
            throw new Error("Invalid ID format");
        }
    }

    const parser = req.url.split("?")[1];
    if (parser) {
        const params = new URLSearchParams(parser);
        for (const [key, value] of params.entries()) {
            queryParams[key] = value;
        }
    }
    let ret = {
        headers: Object.fromEntries(req.headers),
        requestData: {
            ...jsonParams,
            ...queryParams,
            id: req.params.id || ""
        },
        internalData: {},
        resourceID: buf,
        transactionID: symbols.create_tx()
    }
    return ret;
}

export default function route() {

    let ret = {

        "/template": {

            async POST(req: BunRequest) {
                const DAASRequest = await baseDAASRequest(req);
                
                //BEFORE_CALL_POST_GENERATION

                const ptr: Pointer | null = symbols.create_template(/*CALL_POST_GENERATION_PARAMS*/ BigInt(DAASRequest.transactionID));

                if ( !ptr ) {
                    //AFTER_CALL_POST_GENERATION
                    return new Response("Error creating {{template}}", { status: 500 });
                }

                const part1 = read.u64(ptr, 8);
                const part2 = read.u16(ptr, 16);
                const part3 = read.u32(ptr, 18);
                const part4 = read.u16(ptr, 22);
                const buf = Buffer.alloc(16);
                buf.writeBigUInt64BE(part1, 0);
                buf.writeUInt16BE(part2, 8);
                buf.writeUInt32BE(part3, 10);
                buf.writeUInt16BE(part4, 14);
                const hex = buf.toString('hex');

                //AFTER_CALL_POST_GENERATION

                const res = symbols.commit_tx(DAASRequest.transactionID);
                if (res) {
                    return new Response(hex, { status: 201 });
                } else {
                    return new Response("Error committing transaction", { status: 500 });
                }
            }

        },

        "/template/:id": {

            async GET(req: BunRequest) {
                const DAASRequest = await baseDAASRequest(req);
                const buffer = bufferPool4096bytes.acquire();

                try {
                    const length = symbols.get_template_as_json(DAASRequest.resourceID, buffer);
                    if (length === 0) {
                        bufferPool4096bytes.release(buffer);
                        return new Response("Not found", { status: 404 });
                    }
                    symbols.commit_tx(DAASRequest.transactionID);
                    const data = new Uint8Array(buffer.buffer, 0, length);
                    return new Response(data, {
                        headers: {
                            "Content-Length": length.toString(),
                            "Content-Type": "application/json"
                        }
                    });
                } catch (e) {
                    bufferPool4096bytes.release(buffer);
                    return new Response("Error processing request", { status: 500 });
                }

                
            },

            async PATCH(req: BunRequest) {
                const DAASRequest = await baseDAASRequest(req);

                //BEFORE_CALL_PATCH_GENERATION

                symbols.update_template(/*CALL_PATCH_GENERATION_PARAMS*/ DAASRequest.resourceID, BigInt(DAASRequest.transactionID));

                //AFTER_CALL_PATCH_GENERATION

                const res = symbols.commit_tx(DAASRequest.transactionID);
                return new Response(res + "");
            },

            async DELETE(req: BunRequest) {
                const DAASRequest = await baseDAASRequest(req);

                symbols.delete_template(DAASRequest.resourceID, DAASRequest.transactionID);

                const res = symbols.commit_tx(DAASRequest.transactionID);
                return new Response(res + "");
            }

        }

    };
    
    return ret;
}