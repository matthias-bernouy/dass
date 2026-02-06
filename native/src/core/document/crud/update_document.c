#include "document.h"

FnResponse update_document(DocumentComposedID* target, void* data, uint64_t length, uint64_t tx_id, uint64_t last_tx_id) {
    Shard* shard = (Shard*) get_map(map_shards[target->zone], target->shard);
    if (shard == NULL) return NULL;
    
    lockable_element_t* document = &shard->documents[target->id].element;
    bool res = try_lock_lockable(document);
    if (!res) return false;

    FnResponse res_update = safe_total_update_lockable(document, data, length, tx_id, last_tx_id);
    return res_update;
}