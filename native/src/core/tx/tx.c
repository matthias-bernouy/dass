#include "tx.h"

_Atomic uint64_t tx_counter = 1001;
TxMap tx_map[MAX_TX] = {0};