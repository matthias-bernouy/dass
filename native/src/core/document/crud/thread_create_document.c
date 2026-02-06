#include "tx.h"
#include "document.h"
#include "map.h"

// No need to lock because only one thread write in a shard and get unique IDs
FnResponse thread_create_document(DocumentComposedID _id, void* data, uint64_t length, uint64_t tx_id) {
    Shard* shard = (Shard*) get_map(map_shards[_id.zone], _id.shard);
    assert(shard != NULL);
    
    lockable_element_t* document = &shard->documents[_id.id].element;
    FnResponse res = safe_total_update_lockable(document, data, (uint32_t)length, tx_id, IDENTIFIER_EMPTY);
    assert(res == RES_STANDARD_TRUE);
    return res;
}