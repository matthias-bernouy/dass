import { exists_idmap } from "./lib/native_bridge/daas-identity-map";
import { create_map_native, exists_map_native, get_map_native, link_map_native } from "./lib/native_bridge/dass-dlopen";



const map = create_map_native();

if (map === null ){
    throw new Error("Failed to create map");
}

console.log(exists_map_native(map, 123456789));

const start = Bun.nanoseconds();
for (let i = 0; i < 1_500_000; i++) {
    link_map_native(map, BigInt(i), BigInt(i * 10));
}
const end = Bun.nanoseconds();
const duration = end - start;
console.log(`Time to link 1,500,000 entries: ${duration} ns`);
console.log(`Links per second: ${(1_500_000 * 1_000_000_000 / duration).toLocaleString()} ops/s`);