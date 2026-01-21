#include "../headers/transaction_headers.h"

Transaction* get_transaction(uint64_t transaction_id)
{
    MapTransactionEntry* map_entry = &transaction_map[transaction_id & (MAX_TRANSACTIONS - 1)];
    Transaction* transaction = &map_entry->ptr;
    if (transaction->transaction_id != transaction_id) return NULL;    
    return transaction;
}