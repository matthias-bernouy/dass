#include "document.h"
#include "map.h"

Map*              map_shards      [NB_ZONE];
aligned_counter_t shards_counters [NB_ZONE];

_Thread_local Shard* thread_shards[NB_ZONE][NB_SCHEMA] = { NULL };

__attribute__((constructor))
void init_system_document(){
    for (size_t i = 0; i < NB_ZONE; i++)
    {
        map_shards[i] = create_map(1<<12); // 4096 initial shards
        shards_counters[i].value = 0;
    }
}