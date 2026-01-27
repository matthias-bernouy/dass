#include "heap.h"

uint8_t heap[BASE_HEAP_SIZE];
_Atomic uint64_t heap_cursor = 1001;
uint64_t heap_size = (BASE_HEAP_SIZE);

_Thread_local uint64_t thread_reservation_cursor = 0;
_Thread_local uint64_t thread_reservation_limit = 0;