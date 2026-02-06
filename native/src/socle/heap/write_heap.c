#include "heap.h"

void* write_heap(void* data, uint32_t length)
{
    //printf("write_heap: requested length: %u\n", length);
    const final_length = (sizeof(heap_element) + length + 63) & ~63;
    //printf("write_heap: final length: %u\n", final_length);
    if ( final_length > BASE_RESERVATION_PER_THREAD ) {
        assert(false && "Requested length exceeds per-thread reservation size");
        return NULL;
    }
    uint64_t available_memory = thread_reservation_limit - thread_reservation_cursor;
    if (available_memory < final_length || thread_reservation_cursor == 0) {
        thread_reservation_heap();
    }

    heap_element* element = (heap_element*)&heap[thread_reservation_cursor];
    element->status = HEAP_STATUS_USED;
    element->length = final_length;
    memcpy(element->data, data, length);

    thread_reservation_cursor += final_length;

    void* result = &element->data;
    return &element->data;
}