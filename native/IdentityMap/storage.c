#include "../headers/identity_map_headers.h"

_Atomic uint64_t counter_identity_map = 0;
HashIdentityTransactionController table[HASHMAP_SIZE];