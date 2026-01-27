#include "tx.h"

FnResponse add_operation_tx(uint64_t old_cursor, uint64_t new_cursor, atomic_element_t* target, uint64_t tx_id, uint64_t dep_tx_id)
{

    if ( tx_id <= dep_tx_id ) {
        return RES_TX_DEPENDENCY_REJECTED;
    }
    
    atomic_element_t* element = &tx_map[tx_id & MAX_TX_MASK];
    bool locked = try_lock_lockable(element);
    if (!locked) return RES_TX_RESPONSE_RETRY;
    
    Tx* transaction = get_tx(tx_id);

    if (transaction == NULL) {
        free_lockable(element);
        return RES_TX_NO_TRANSACTION_FOUND_IN_ADD_ACTION_TRANSACTION;
    }

    transaction->operations[transaction->operation_counter] = (TxOperation) {
        .old_heap_cursor = old_cursor,
        .new_heap_cursor = new_cursor,
        .dep_tx_id = dep_tx_id,
        .target = target
    };

    transaction->operation_counter += 1;

    free_lockable(element);

    return RES_STANDARD_TRUE;
}