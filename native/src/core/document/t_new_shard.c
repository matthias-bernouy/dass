#include "document.h"

void thread_new_shard(uint16_t zone, uint32_t schema_type) {
        retry:
        uint64_t pagination = atomic_fetch_add_explicit(&shards_pagination_counter[zone][schema_type].value, 1, memory_order_relaxed);
        uint64_t new_id = pagination * NB_SCHEMA + 1;
        // printf("Creating new shard %llu for zone %u and schema %u\n and pagination %llu\n", new_id, zone, schema_type, pagination);
        if (!im_shard_manager(zone, (uint32_t)new_id)) goto retry;
        Shard* shard_ptr = calloc_heap(sizeof(Shard));
        shard_ptr->shard_id = new_id;
        shard_ptr->counter = 0;
        thread_shards[zone][schema_type] = shard_ptr;
}
