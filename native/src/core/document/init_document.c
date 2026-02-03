#include "document.h"

Shard* shards_map[NB_ZONE][DEFAULT_MAX_SHARD] = { NULL };
aligned_counter_t shards_pagination_counter[NB_ZONE][NB_SCHEMA] = {0};
_Thread_local Shard* thread_shards[NB_ZONE][NB_SCHEMA] = { NULL };

void init_schema_shards_counters(){
    for (size_t i = 0; i < NB_ZONE; i++)
    {
        for (size_t j = 0; j < NB_SCHEMA; j++)
        {
            shards_pagination_counter[i][j].value = j;
        }
    }
}