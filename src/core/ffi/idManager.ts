import { bufferPool256bytes } from "src/utilities/ObjectPool";

export const SECRET_MASK = 0xA23D9AA16E71C85An;

export const idToBuffer = (idStr: string): Buffer<ArrayBuffer> => {
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