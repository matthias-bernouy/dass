#include "Headers/transaction_headers.h"

FnResponse add_action_transaction(uint64_t transaction_id, uint32_t action_provider, PayloadTransaction *payload)
{
    // TODO: Need to free the data after resetting the transaction
    void* persistent_data = malloc(payload->size);
    memcpy(persistent_data, payload->data, payload->size);

    Transaction *transaction = get_transaction(transaction_id);
    if (transaction == NULL)
        return RES_TX_NO_TRANSACTION_FOUND_IN_ADD_ACTION_TRANSACTION;
    if (!is_status(&transaction->status, TX_STATUS_STARTED))
        return RES_TX_TRANSACTION_NOT_ACTIVE;
    uint32_t action_index = atomic_fetch_add_explicit(&transaction->action_counter, 1, memory_order_acq_rel);
    
    if (action_index >= TRANSACTION_MAX_ACTIONS)
    {
        atomic_fetch_sub_explicit(&transaction->action_counter, 1, memory_order_acq_rel);
        return RES_SYS_ERR_FULL;
    }
    transaction->actions[action_index].type   = action_provider;
    transaction->actions[action_index].size   = payload->size;
    transaction->actions[action_index].data   = persistent_data;
    transaction->actions[action_index].target = payload->target;
    return RES_STANDARD_SUCCESS;
}