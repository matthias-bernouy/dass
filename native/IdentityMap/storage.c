#include "../headers/identity_map_headers.h"

_Atomic uint64_t counter_identity_map = 1001;
HashIdentityTransactionController identity_hashed_map[HASHMAP_SIZE];