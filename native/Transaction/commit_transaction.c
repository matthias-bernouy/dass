#include "../headers/transaction_headers.h"

TX_RESPONSE commit_transaction(uint64_t transaction_id)
{
    // Get the transaction.
    Transaction *tx = get_transaction(transaction_id);
    if (tx == NULL) return TX_RESPONSE_ERR_CORRUPTED;

    // Set to waiting.
    if (is_status(&tx->status, TX_STATUS_STARTED)) {
        bool ok = try_change_status(&tx->status, TX_STATUS_STARTED, TX_STATUS_WAITING);
        if (!ok) return TX_RESPONSE_AN_OTHER_COMMIT_TAKE_THE_LOCK;
    } else {
        return TX_RESPONSE_ALREADY_WAITING_FOR_COMMIT;
    }

    // Check dependencies status.
    for (uint32_t i = 0; i < tx->depends_on_counter; i++)
    {
        uint64_t dep_id = tx->depends_on[i];
        Transaction *dep_tx = get_transaction(dep_id);
        if (dep_tx == NULL) return TX_RESPONSE_ERR_CORRUPTED;
        TX_STATUS status_dependency = atomic_load_explicit(&dep_tx->status, memory_order_acquire);

        if (status_dependency == TX_STATUS_ABORTED) {
            try_change_status(&tx->status, TX_STATUS_WAITING, TX_STATUS_ABORTED);
            return TX_RESPONSE_RETRY;
        }

        if (status_dependency == TX_STATUS_STARTED || status_dependency == TX_STATUS_WAITING)
        {
            return TX_RESPONSE_DEPENCIES_ARE_NOT_COMMITED;
        }

        if (status_dependency != TX_STATUS_COMMITED &&
            status_dependency != TX_STATUS_LOCAL_PERSISTED &&
            status_dependency != TX_STATUS_GLOBAL_PERSISTED)
        {
            return TX_RESPONSE_ERR_CORRUPTED;
        }
    }

    // Perform commit actions.
    for (uint32_t i = 0; i < tx->action_counter; i++)
    {
        PayloadTransaction *action = &tx->actions[i];
        if (action->data == NULL){
            return TX_RESPONSE_ERR_CORRUPTED;
        };
        MapHandlerEntry* handler = &handler_map[action->type];
        if (handler->perform == NULL)
        {
            return TX_RESPONSE_ERR_CORRUPTED;
        }
        handler->perform(action, TX_STATUS_COMMITED);
    }

    // Calculate checksum.
    uint32_t hash = 0;
    for (uint32_t i = 0; i < tx->action_counter; i++)
    {
        hash = xxh32_fixed(tx->actions[i].data, tx->actions[i].size, (uint32_t)hash);
    }
    tx->checksum = hash;

    // Set to commited.
    bool ok = try_change_status(&tx->status, TX_STATUS_WAITING, TX_STATUS_COMMITED);
    if (!ok) return TX_RESPONSE_ERR_CORRUPTED;

    return TX_RESPONSE_OK;
}