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
            existing_tx->status = TX_STATUS_STARTED;
            existing_tx->tx_id = index;
            existing_tx->operation_counter = 0;
            existing_tx->checksum = 0;
            free_lockable(element);
        } else {
            Tx new_tx = {
                .tx_id = index,
                .status = TX_STATUS_STARTED,
                .operation_counter = 0,
                .checksum = 0
            };

            uint64_t new_cursor = write_heap(&new_tx, sizeof(Tx));
            if ( is_id_error(new_cursor) ) {
                free_lockable(element);
                continue;
            }

            free_update_lockable(element, new_cursor);
        }

        return index;
    }
    return RES_IDENTIFIER_FULL;
}