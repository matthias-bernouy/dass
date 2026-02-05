#include "tx.h"

// maybe no need lock here because only one thread can work on a transaction at a time ?
FnResponse add_operation_tx(void* old_data, void* new_data, lockable_element_t* target, uint64_t tx_id, uint64_t dep_tx_id)
{

    if ( tx_id <= dep_tx_id ) return RES_TX_DEPENDENCY_REJECTED;
    
    lockable_element_t* element = &tx_map[tx_id & MAX_TX_MASK];
    Tx* tx = try_get_and_lock_lockable(element);

    // Case when lock is not acquired OR transaction does not exist
    if (tx == NULL) {
        Tx* tx = get_lockable(element);
        assert(tx != NULL);
        if (tx == NULL) return RES_TX_NO_TRANSACTION_FOUND_IN_START_OF_COMMIT;
        else return RES_TX_RESPONSE_RETRY;
    }

    tx->operations[tx->operation_counter] = (TxOperation) {
        .old_data = old_data,
        .new_data = new_data,
        .dep_tx_id = dep_tx_id,
        .target = target
    };

    tx->operation_counter += 1;

    free_lockable(element);

    return RES_STANDARD_TRUE;
}