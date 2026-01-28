#include "heap.h"

uint8_t heap[BASE_HEAP_SIZE] = {0};
_Atomic uint64_t heap_cursor = 1024;
uint64_t heap_size = (BASE_HEAP_SIZE);

_Thread_local uint64_t thread_reservation_cursor = 0;
_Thread_local uint64_t thread_reservation_limit = 0;