#include "document.h"
#include "system.h"
#include "map.h"

Shard* thread_new_shard_document(uint16_t zone, uint32_t schema_type) {

    thread_rng_seed = random();

    uint64_t next_shard_id;

    retry:
        next_shard_id = atomic_fetch_add_explicit(&shards_counters[zone].value, 1, memory_order_relaxed);
        if (!im_shard_manager(zone, (uint32_t)next_shard_id)) goto retry;

    Shard* shard_ptr = calloc_heap(sizeof(Shard));
    assert(shard_ptr != NULL);
    shard_ptr->shard_id = next_shard_id;
    shard_ptr->counter = 0;
    shard_ptr->schema_id = schema_type;

    FnResponse res = link_map(map_shards[zone], next_shard_id, (uint64_t)shard_ptr);
    assert(res == RES_STANDARD_TRUE);
    thread_shards[zone][schema_type] = shard_ptr;

    // add to schema index, but not for now, not implemented yet

    return shard_ptr;
}