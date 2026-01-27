#include "Headers/heap_headers.h"

void thread_reservation_memory()
{
    if (thread_reservation_cursor != thread_reservation_limit) {
        void* data = &heap_memory[thread_reservation_cursor];
        write_memory(data, thread_reservation_limit - thread_reservation_cursor);
        free_memory(thread_reservation_cursor);
    }

    uint64_t new_cursor = atomic_fetch_add_explicit(&heap_cursor, (1ULL << BASE_RESERVATION_PER_THREAD), memory_order_acq_rel);
    uint64_t new_limit = new_cursor + (1ULL << BASE_RESERVATION_PER_THREAD);

    thread_reservation_cursor = new_cursor;
    thread_reservation_limit = new_limit;

}