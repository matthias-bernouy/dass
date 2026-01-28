#include "heap.h"

void reservation_heap()
{
    // if (thread_reservation_cursor != thread_reservation_limit) {
    //     void* data = &heap[thread_reservation_cursor];
    //     write_heap(data, thread_reservation_limit - thread_reservation_cursor);
    //     free_heap(thread_reservation_cursor);
    // }

    uint64_t new_cursor = atomic_fetch_add_explicit(&heap_cursor, (BASE_RESERVATION_PER_THREAD), memory_order_acq_rel);
    uint64_t new_limit = new_cursor + (BASE_RESERVATION_PER_THREAD);

    thread_reservation_cursor = new_cursor;
    thread_reservation_limit = new_limit;
}