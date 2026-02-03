import { init_schema_shards_counters_native, test_native } from "./lib/native_bridge/dass-dlopen";

const start = Bun.nanoseconds();
init_schema_shards_counters_native();

const end = Bun.nanoseconds();
const duration = end - start;
console.log(`Initialized schema shards counters in ${duration / 1_000_000}  ms`);


for (let index = 0; index < array.length; index++) {
    const element = array[index];
    
}
test_native();