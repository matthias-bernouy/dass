#include "heap.h"

void* write_heap(void* data, uint32_t length)
{
    if ( length > BASE_RESERVATION_PER_THREAD ) {
        assert(false && "Requested length exceeds per-thread reservation size");
        return NULL;
    }
    uint64_t available_memory = thread_reservation_limit - thread_reservation_cursor;
    if (available_memory < length || thread_reservation_cursor == 0) {
        thread_reservation_heap();
    }

    heap_element* element = (heap_element*)&heap[thread_reservation_cursor];
    element->status = HEAP_STATUS_USED;
    element->length = length;
    memcpy(element->data, data, length);

    thread_reservation_cursor += (sizeof(heap_element) + length + 63) & ~63;
    void* result = &element->data;
    return &element->data;
}