#include "heap.h"

void thread_reservation_heap()
{
    printf("Réservation heap: cursor: %lu, limit: %lu\n", thread_reservation_cursor, thread_reservation_limit);
    uint64_t new_thread_heap_cursor = atomic_fetch_add_explicit(&heap_cursor, (BASE_RESERVATION_PER_THREAD), memory_order_acq_rel);

    if (thread_reservation_cursor != thread_reservation_limit) {
        void* data = &heap[thread_reservation_cursor];
        void* result = write_heap(data, thread_reservation_limit - thread_reservation_cursor - sizeof(heap_element));
        free_heap(result);
    }

    if (new_thread_heap_cursor + BASE_RESERVATION_PER_THREAD > BASE_HEAP_SIZE) {
        assert(false && "Out of heap memory");
    }

    // printf("new_thread_heap_cursor: %lu, available heap: %lu\n", new_thread_heap_cursor, BASE_HEAP_SIZE - new_thread_heap_cursor);

    uint64_t new_limit = new_thread_heap_cursor + BASE_RESERVATION_PER_THREAD;
    thread_reservation_cursor = new_thread_heap_cursor;
    thread_reservation_limit = new_limit;
}