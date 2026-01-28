#include "heap.h"

uint64_t write_heap(void* data, uint32_t length)
{
    if ( length > BASE_RESERVATION_PER_THREAD ) {
        return RES_WRITE_MEMORY_ERROR;
    }
    uint64_t available_memory = thread_reservation_limit - thread_reservation_cursor;
    if (available_memory < length) {
        reservation_heap();
    }

    uint64_t cursor = thread_reservation_cursor;
    heap_element* element = (heap_element*)&heap[cursor];
    element->status = 1;
    element->length = length;
    memcpy(element->data, data, length);

    thread_reservation_cursor += (sizeof(heap_element) + length + 7) & ~7;
    return cursor;
}