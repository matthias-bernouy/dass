#include "document.h"

FnResponse delete_document(DocumentComposedID* target, uint64_t tx_id, uint64_t last_tx_id) {
    Shard* shard = (Shard*) get_map(map_shards[target->zone], target->shard);
    if (shard == NULL) return NULL;
    
    lockable_element_t* document = &shard->documents[target->id].element;
    bool res = try_lock_lockable(document);
    if (!res) return false;

    void* data = calloc_heap(24);

    FnResponse res_update = safe_total_update_lockable(document, data, 24, tx_id, last_tx_id);
    return res_update;
}