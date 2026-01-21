#include "../headers/transaction_headers.h"

TX_RESPONSE add_dependency_to_transaction(uint64_t my_id, uint64_t owner_id)
{
    if (my_id > owner_id){
        Transaction *tx = get_transaction(my_id);
        Transaction *tx_target = get_transaction(owner_id);
        if (tx == NULL) return TX_RESPONSE_ERR_CORRUPTED;
        if (tx_target == NULL) return TX_RESPONSE_ERR_CORRUPTED;
        uint32_t tx_target_dep_index = atomic_fetch_add_explicit(&tx_target->dependencies_of_counter, 1, memory_order_acq_rel);
        uint32_t my_tx_dep_index = atomic_fetch_add_explicit(&tx->depends_on_counter, 1, memory_order_acq_rel);
        if (my_tx_dep_index >= TRANSACTION_MAX_DEPENDENCIES || tx_target_dep_index >= TRANSACTION_MAX_DEPENDENCIES)
        {
            atomic_fetch_sub_explicit(&tx->depends_on_counter, 1, memory_order_acq_rel);
            atomic_fetch_sub_explicit(&tx_target->dependencies_of_counter, 1, memory_order_acq_rel);
            return TX_RESPONSE_ERR_FULL;
        }
        tx->depends_on[my_tx_dep_index] = owner_id;
        tx_target->dependencies_of[tx_target_dep_index] = my_id;
        return TX_RESPONSE_OK;
    }
    return TX_RESPONSE_DEPENDENCY_REJECTED;
}