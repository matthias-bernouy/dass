#include "tx.h"

uint64_t create_tx()
{
    for (int i = 0; i < 32; i++)
    {
        uint64_t index = atomic_fetch_add_explicit(&tx_counter, 1, memory_order_relaxed);

        lockable_element_t* element = &tx_map[index & MAX_TX_MASK];
        Tx* tx_start = get_lockable(element);

        if (tx_start != NULL && tx_start->status != TX_STATUS_FREE) {
            continue;
        }

        Tx* tx_end = try_get_and_lock_lockable(element);

        if (tx_end != tx_start) {
            free_lockable(element);
            continue;
        }
        
        if (tx_end == NULL){
            Tx new_tx = {
                .tx_id = index,
                .status = TX_STATUS_STARTED,
                .operation_counter = 0,
                .checksum = 0
            };
            free_update_lockable(element, &new_tx, sizeof(Tx));
        } else {
            tx_end->status = TX_STATUS_STARTED;
            tx_end->tx_id = index;
            tx_end->operation_counter = 0;
            tx_end->checksum = 0;
            free_lockable(element);
        }
        return index;
    }

    return RES_IDENTIFIER_FULL;
}