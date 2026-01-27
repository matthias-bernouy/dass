#include "tx.h"

_Atomic uint64_t global_handler_counter = 0;
_Atomic uint64_t global_transaction_counter = 1001;
MapTransactionEntry transaction_map[MAX_TRANSACTIONS];

_Thread_local uint64_t tx_id_cursor = 0;
_Thread_local uint64_t tx_id_limit = 0;