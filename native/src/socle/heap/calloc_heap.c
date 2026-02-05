#include "heap.h"

void* calloc_heap(uint32_t length)
{
    if ( length > BASE_RESERVATION_PER_THREAD ) {
        return NULL;
    }
    uint64_t available_memory = thread_reservation_limit - thread_reservation_cursor;
    if (available_memory < length || thread_reservation_cursor == 0) {
        thread_reservation_heap();
    }


    uint64_t cursor = thread_reservation_cursor;

    heap_element* element = (heap_element*)&heap[cursor];
    
    element->status = HEAP_STATUS_USED;
    element->length = length;

    thread_reservation_cursor += (sizeof(heap_element) + length + 63) & ~63;
    
    void* result = &element->data;
    return &element->data;
}