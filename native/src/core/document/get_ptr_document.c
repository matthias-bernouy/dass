#include "document.h"

lockable_element_t* get_document_ptr(DocumentComposedID doc_id) {
    Shard* shard = atomic_load_explicit(&shards_map[doc_id.zone][doc_id.shard], memory_order_acquire);
    if (!shard) return NULL;
    return &shard->documents[doc_id.id].element;
}