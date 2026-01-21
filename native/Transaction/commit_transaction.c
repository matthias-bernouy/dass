#include "../headers/transaction_headers.h"

FnResponse commit_transaction(uint64_t transaction_id)
{
    // Get the transaction.
    Transaction *tx = get_transaction(transaction_id);
    if (tx == NULL) return RES_SYS_ERR_CORRUPTED;

    // Set to waiting.
    if (is_status(&tx->status, TX_STATUS_STARTED)) {
        bool ok = try_change_status(&tx->status, TX_STATUS_STARTED, TX_STATUS_WAITING);
        if (!ok) return RES_TX_RESPONSE_AN_OTHER_COMMIT_TAKE_THE_LOCK;
    } else {
        return RES_TX_RESPONSE_ALREADY_WAITING_FOR_COMMIT;
    }

    // Check dependencies status.
    for (uint32_t i = 0; i < tx->depends_on_counter; i++)
    {
        uint64_t dep_id = tx->depends_on[i];
        Transaction *dep_tx = get_transaction(dep_id);
        if (dep_tx == NULL) return RES_SYS_ERR_CORRUPTED;
        TX_STATUS status_dependency = atomic_load_explicit(&dep_tx->status, memory_order_acquire);

        if (status_dependency == TX_STATUS_ABORTED) {
            try_change_status(&tx->status, TX_STATUS_WAITING, TX_STATUS_ABORTED);
            return RES_TX_RESPONSE_RETRY;
        }

        if (status_dependency == TX_STATUS_STARTED || status_dependency == TX_STATUS_WAITING)
        {
            return RES_TX_RESPONSE_DEPENDENCIES_ARE_NOT_COMMITED;
        }

        if (status_dependency != TX_STATUS_COMMITED &&
            status_dependency != TX_STATUS_LOCAL_PERSISTED &&
            status_dependency != TX_STATUS_GLOBAL_PERSISTED)
        {
            return RES_SYS_ERR_CORRUPTED;
        }
    }

    // Perform commit actions.
    for (uint32_t i = 0; i < tx->action_counter; i++)
    {
        PayloadTransaction *action = &tx->actions[i];
        if (action->data == NULL){
            return RES_SYS_ERR_CORRUPTED;
        };
        MapHandlerEntry* handler = &handler_map[action->type];
        if (handler->perform == NULL)
        {
            return RES_SYS_ERR_CORRUPTED;
        }

        // Problem : handler perform can return error but we ignore it here.
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
    if (!ok) return RES_SYS_ERR_CORRUPTED;

    return RES_STANDARD_SUCCESS;
}