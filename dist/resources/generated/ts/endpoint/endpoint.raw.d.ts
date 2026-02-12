import type { BunRequest } from "bun";
export default function endpoint(): {
    "/target": {
        METHOD(req: BunRequest): Promise<Response>;
    };
};
