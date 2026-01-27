#include "tx.h"

Tx* get_transaction(uint64_t tx_id)
{
    atomic_element_t* element = &tx_map[tx_id & MAX_TX_MASK];
    MetadataConcurrencyElement meta = wait_metadata_lockable(element);
    const heap_element* heap_element = read_heap(meta.cursor);
    if (heap_element == NULL) return NULL;
    Tx* tx = (Tx*)heap_element->data;
    if (tx->tx_id != tx_id) return NULL;    
    return tx;
}