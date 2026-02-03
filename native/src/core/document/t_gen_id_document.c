#include "document.h"
#include "heap.h"
#include "system.h"

DocumentComposedID thread_gen_document_id(uint16_t zone, uint32_t schema_type) {
    retry:
    Shard* shard = thread_shards[zone][schema_type];
    if (shard == NULL || shard->counter >= MAX_DOCUMENT_IN_SHARD) {
        thread_new_shard(zone, schema_type);
        goto retry;
    }
    uint16_t id_in_shard = (uint16_t)(shard->counter++);
    DocumentComposedID doc_id = {
        .salt = random64(),
        .zone = zone,
        .shard = shard->shard_id,
        .id = id_in_shard
    };
    return doc_id;
}