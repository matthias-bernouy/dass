#include "document.h"

void* get_document(DocumentComposedID* id, uint32_t schema_id) {
    Shard* shard = (Shard*) get_map(map_shards[id->zone], id->shard);
    if (shard == NULL) return NULL;
    if (shard->schema_id != schema_id) return NULL;
    
    lockable_element_t* document = &shard->documents[id->id].element;
    void* data = metadata_lockable(document).data;
    uint64_t salt = *((uint64_t*)data);
    if (salt != id->salt) return NULL;
    return data;
}