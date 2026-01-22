#include "../headers/transaction_headers.h"

_Atomic uint64_t global_handler_counter = 0;
_Atomic uint64_t global_transaction_counter = 1001;
MapTransactionEntry transaction_map[MAX_TRANSACTIONS];
MapHandlerEntry handler_map[TRANSACTION_MAX_HANDLER];