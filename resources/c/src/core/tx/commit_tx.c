#include "tx.h"

FnResponse commit_tx(uint64_t tx_id)
{
    lockable_element_t* element = &tx_map[tx_id & MAX_TX_MASK];
    Tx* tx = try_get_and_lock_lockable(element);

    // Case when lock is not acquired OR transaction does not exist
    if (tx == NULL) {
        Tx* tx = get_lockable(element);
        assert(tx != NULL);
        if (tx == NULL) return RES_TX_NO_TRANSACTION_FOUND_IN_START_OF_COMMIT;
        else return RES_TX_RESPONSE_RETRY;
    }

    // Check all operations dependencies
    for (uint32_t i = 0; i < tx->operation_counter; i++) {
        TxOperation* operation = &tx->operations[i];
        if ( operation->dep_tx_id == IDENTIFIER_EMPTY ) continue;
        Tx* tx_dep = get_lockable(operation->target);
        if (tx_dep->status == TX_STATUS_FREE) {
            free_lockable(element);
            continue;
        }
        assert(tx_dep != NULL);
        if (tx_dep == NULL) {
            free_lockable(element);
            return RES_TX_NO_TRANSACTION_FOUND;
        }
        if (tx_dep->status != TX_STATUS_COMMITED && tx_dep->status != TX_STATUS_LOCAL_PERSISTED) {
            free_lockable(element);
            return RES_TX_RESPONSE_DEPENDENCIES_ARE_NOT_COMMITED;
        }
        if (tx_dep->status == TX_STATUS_ABORTED) {
            tx->status = TX_STATUS_FREE;
            abort_operations_tx(tx->operations, tx->operation_counter);
            free_lockable(element);
            return RES_TX_RESPONSE_ABORTED;
        }
    }

    for (uint32_t i = 0; i < tx->operation_counter; i++) {
        TxOperation* operation = &tx->operations[i];
        if (operation->dep_tx_id != IDENTIFIER_EMPTY){
            free_heap(operation->old_data);
        }
        free_heap(operation->new_data);
    }

    // Apply all operations
    tx->status = TX_STATUS_FREE; // Should be TX_STATUS_COMMITED but we free for development purposes
    free_lockable(element);

    return RES_STANDARD_TRUE;
}