#include "../headers/transaction_headers.h"

uint64_t create_transaction()
{
    uint64_t start_time = get_now_nanoseconds();
    for (int i = 0; i < 32; i++)
    {
        if (tx_id_cursor == tx_id_limit) {
            tx_id_cursor = atomic_fetch_add_explicit(&global_transaction_counter, THREAD_TRANSACTION_BATCH_SIZE, memory_order_relaxed);
            tx_id_limit = tx_id_cursor + THREAD_TRANSACTION_BATCH_SIZE;
        }
        uint64_t index = tx_id_cursor++;
        MapTransactionEntry *map_entry = &transaction_map[index & (MAX_TRANSACTIONS - 1)];
        Transaction *tx = &map_entry->ptr;
        if (try_change_status(&tx->status, TX_STATUS_FREE, TX_STATUS_STARTED) == RES_STANDARD_TRUE)
        {
            tx->transaction_id = index;
            return index;
        }
    }
    return RES_IDENTIFIER_FULL;
}