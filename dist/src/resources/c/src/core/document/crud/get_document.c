#include "document.h"

void* get_document(DocumentComposedID* id, uint32_t schema_id) {
    if (id->zone >= NB_ZONE) return NULL;
    Shard* shard = (Shard*) get_map(map_shards[id->zone], id->shard);
    if (shard == 0XFFFFFFFFFFFFFFFFULL ) return NULL;
    if (shard == NULL) return NULL;
    if (shard->schema_id != schema_id) return NULL;
    
    lockable_element_t* document = &shard->documents[id->id].element;
    void* data = metadata_lockable(document).data;
    uint64_t salt = *((uint64_t*)data+1); // Because the first 64bits are the tx_id
    if (salt != id->salt) return NULL;
    return data;
}