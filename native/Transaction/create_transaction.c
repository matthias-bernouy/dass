#include "../headers/transaction_headers.h"

uint64_t create_transaction()
{
    for (int i = 0; i < MAX_TRANSACTIONS; i++)
    {
        uint64_t index = atomic_fetch_add_explicit(&global_transaction_counter, 1, memory_order_relaxed);
        MapTransactionEntry *map_entry = &transaction_map[index & (MAX_TRANSACTIONS - 1)];
        Transaction *tx = &map_entry->ptr;
        if (try_change_status(&tx->status, TX_STATUS_FREE, TX_STATUS_STARTED) == RES_STANDARD_TRUE)
        {
            tx->transaction_id = index;
            tx->timestamp = get_now_nanoseconds();
            return index;
        }
    }
    return RES_IDENTIFIER_FULL;
}