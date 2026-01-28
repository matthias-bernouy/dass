#include "tx.h"

_Atomic uint64_t tx_counter = IDENTIFIER_START_INDEX;
TxMap tx_map[MAX_TX] = {0};