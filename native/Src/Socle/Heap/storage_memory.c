#include "Headers/heap_headers.h"

_Atomic uint64_t heap_cursor = 1001;
uint64_t heap_size = (1ULL << BASE_HEAP_SIZE);
uint64_t heap_free_if_full_compaction = (1ULL << BASE_HEAP_SIZE) - 1000;