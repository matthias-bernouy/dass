// #include "../headers/transaction_headers.h"

// bool write_to_disk_transaction(uint64_t transaction_id)
// {
//     MapTransactionEntry *map_entry = &transaction_map[transaction_id & (MAX_TRANSACTIONS - 1)];
//     Transaction *transaction = get_transaction(transaction_id);
//     if (transaction == NULL)
//         return false;
//     if (!is_status(&transaction->status, TRANSACTION_STATUS_COMMITED_MASK))
//         return false;
//     bool statusChanged = try_change_status(&transaction->status, TRANSACTION_STATUS_COMMITED_MASK, TRANSACTION_STATUS_WRITING_ON_DISK_STARTED_MASK);
//     if (!statusChanged)
//         return false;

//     // Ici on écrirait la transaction sur le disque (simulation)

//     reset_transaction(transaction);
//     return true;
// }