#include "Headers/transaction_headers.h"

// void reset_transaction(Transaction *transaction)
// {
//     transaction->transaction_id = 0;
//     transaction->timestamp = 0;
//     transaction->checksum = 0;

//     atomic_store_explicit(&transaction->action_counter, 0, memory_order_release);
//     atomic_store_explicit(&transaction->depends_on_counter, 0, memory_order_release);
//     atomic_store_explicit(&transaction->dependencies_of_counter, 0, memory_order_release);
//     atomic_store_explicit(&transaction->status, TX_STATUS_FREE, memory_order_release);
// }
