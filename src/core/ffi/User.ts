import { ptr, read, toArrayBuffer, type Pointer } from "bun:ffi";
import { bufferPool256bytes } from "src/utilities/ObjectPool";
import { create_user_native, get_document_native } from "./dass-dlopen";

type DocumentID = {
    salt: bigint;  // 64bits
    zone: number;  // 16bits
    shard: number; // 32bits
    id: number;    // 16bits
}

const SECRET_MASK = 0xA23D9AA16E71C85An; // 64 bits mask

const idToBuffer = (idStr: string): Buffer<ArrayBuffer> => {
    const buffer = bufferPool256bytes.acquire();
    
    const salt = BigInt("0x" + idStr.substring(0, 16));
    const hidden = BigInt("0x" + idStr.substring(16, 32));
    const others = hidden ^ SECRET_MASK;

    buffer.writeBigUInt64LE(salt, 0);
    const zone = Number(others & 0xFFFFn);
    const shard = Number((others >> 16n) & 0xFFFFFFFFn);
    const id = Number((others >> 48n) & 0xFFFFn);

    buffer.writeUInt16LE(zone, 8);
    buffer.writeUInt32LE(shard, 10);
    buffer.writeUInt16LE(id, 14);

    return buffer;
}

export class User {

    private pointer: Pointer;

    private constructor(user: Pointer){
        this.pointer = user;
    }

    get id(): string {
        const salt   = read.u64(this.pointer, 0);
        const others = read.u64(this.pointer, 8);
        
        const hidden = others ^ SECRET_MASK;
        
        return BigInt.asUintN(64, salt).toString(16).padStart(16, "0") + 
            BigInt.asUintN(64, hidden).toString(16).padStart(16, "0");
    }

    get email(): string {
        const length = read.u32(this.pointer, 16);
        if (length === 0) return "";
        const emailBytes = new Uint8Array(toArrayBuffer(this.pointer, 32, length));
        return new TextDecoder().decode(emailBytes);
    }

    get fullname(): string {
        const startLen = read.u32(this.pointer, 16);
        const length = read.u32(this.pointer, 20);
        if (length === 0) return "";
        const fullnameBytes = new Uint8Array(toArrayBuffer(this.pointer, 32 + startLen, length));
        return new TextDecoder().decode(fullnameBytes);
    }

    static create(email: string, fullname: string, tx_id: bigint): User | null {
        const bufferEmail    = bufferPool256bytes.acquire();
        const bufferFullname = bufferPool256bytes.acquire();
        const emailLength = bufferEmail.write(email);
        const fullnameLength = bufferFullname.write(fullname);

        const userPtr = create_user_native(ptr(bufferEmail), emailLength, ptr(bufferFullname), fullnameLength, tx_id);

        bufferPool256bytes.release(bufferEmail);
        bufferPool256bytes.release(bufferFullname);

        if (userPtr === null) return null;

        const user = new User(userPtr);
        return user;
    }

    // String is stored as uuid format without dashes, so it should be 32 bytes long
    static fromID(id: string): User | null {
        const buffer = idToBuffer(id);
        if (id.length !== 32) {
            throw new Error("ID must be 32 characters long");
        }
        const doc = get_document_native(ptr(buffer));
        bufferPool256bytes.release(buffer);
        if (doc === null) return null;
        return new User(doc);
    }

}