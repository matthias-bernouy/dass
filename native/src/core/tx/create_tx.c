#include "tx.h"

uint64_t create_tx()
{
    for (int i = 0; i < 32; i++)
    {
        uint64_t index = atomic_fetch_add_explicit(&tx_counter, 1, memory_order_relaxed);
        atomic_element_t* element = &tx_map[index & MAX_TX_MASK];
        
        bool locked = try_lock_lockable(element);
        if (!locked) continue;

        MetadataConcurrencyElement meta = metadata_lockable(element);
        if (meta.cursor != 0) {
            Tx* existing_tx = (Tx*)read_heap(meta.cursor)->data;
            if (existing_tx->status != TX_STATUS_FREE) {
                free_lockable(element);
                continue;
            }
        }

        Tx tx;
        tx.status = TX_STATUS_STARTED;
        tx.tx_id = index;
        tx.operation_counter = 0;
        tx.checksum = 0;

        uint64_t cursor = write_heap(&tx, sizeof(Tx));
        if (cursor == RES_WRITE_MEMORY_ERROR) {
            return RES_WRITE_MEMORY_ERROR;
        }

        free_update_lockable(element, cursor);

        return index;
    }
    return RES_IDENTIFIER_FULL;
}