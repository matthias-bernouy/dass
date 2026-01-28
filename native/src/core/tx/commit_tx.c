#include "tx.h"

FnResponse commit_tx(uint64_t tx_id)
{
    lockable_element_t* element = &tx_map[tx_id & MAX_TX_MASK];
    bool locked = try_lock_lockable(element);
    if (!locked) return RES_TX_RESPONSE_RETRY;
    
    Tx* tx = get_tx(tx_id);

    if (tx == NULL) {
        free_lockable(element);
        return RES_TX_NO_TRANSACTION_FOUND;
    }

    // for (uint32_t i = 0; i < tx->operation_counter; i++) {
    //     TxOperation* operation = &tx->operations[i];
    //     if ( operation->dep_tx_id < 1001 ) continue;
    //     Tx* tx_dep = get_tx(operation->dep_tx_id);
    //     if (tx_dep == NULL) {
    //         free_lockable(element);
    //         return RES_TX_NO_TRANSACTION_FOUND;
    //     }
    //     if (tx_dep->status != TX_STATUS_COMMITED && tx_dep->status != TX_STATUS_LOCAL_PERSISTED) {
    //         free_lockable(element);
    //         return RES_TX_RESPONSE_DEPENDENCIES_ARE_NOT_COMMITED;
    //     }
    //     if (tx_dep->status == TX_STATUS_ABORTED) {
    //         tx->status = TX_STATUS_FREE;
    //         abort_operations_tx(tx->operations, tx->operation_counter);
    //         free_lockable(element);
    //         return RES_TX_RESPONSE_ABORTED;
    //     }
    // }


    tx->status = TX_STATUS_FREE;
    free_lockable(element);

    return RES_STANDARD_TRUE;
}