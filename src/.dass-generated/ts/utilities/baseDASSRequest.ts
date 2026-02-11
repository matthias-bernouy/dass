import { BunRequest } from "bun";
import { DAASRequest } from "../server.raw";
import { symbols } from "../ffi_methods.raw";

export const baseDASSRequest = async (req: BunRequest): Promise<DAASRequest> => {
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