
#include "Headers/heap_headers.h"

uint64_t write_memory(uint8_t* data, uint64_t length)
{
    if ( length > BASE_RESERVATION_PER_THREAD ) {
        return RES_WRITE_MEMORY_ERROR; // change to FnResponse error code
    }
    uint64_t available_memory = thread_reservation_limit - thread_reservation_cursor;
    if (available_memory < length) {
        thread_reservation_memory();
    }

    uint64_t cursor = thread_reservation_cursor;
    memory_element* element = (memory_element*)&heap_memory[cursor];
    element->status = 1;
    element->length = (uint32_t)length;
    memcpy(element->data, data, length);

    thread_reservation_cursor += length + sizeof(memory_element);
    return cursor;
}