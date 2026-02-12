#include "tx.h"

FnResponse abort_tx(uint64_t tx_id)
{
    lockable_element_t* element = &tx_map[tx_id & MAX_TX_MASK];
    bool locked = try_lock_lockable(element);
    if (!locked) return RES_TX_RESPONSE_RETRY;
    
    Tx* tx = get_lockable(element);

    tx->status = TX_STATUS_ABORTED;

    abort_operations_tx(tx->operations, tx->operation_counter);

    free_lockable(element);

    return RES_STANDARD_TRUE;
}