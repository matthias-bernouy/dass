#include "heap.h"

const void* get_ptr_heap(uint64_t cursor){

    return &heap[cursor + sizeof(heap_element)];
    #ifdef DEV_MODE
        heap_element* element = (heap_element*) &heap[cursor];
        assert(element != NULL);
        uint64_t read_only_element = write_heap(element->data, element->length);
        assert(read_only_element != RES_WRITE_MEMORY_ERROR);
        return &heap[read_only_element];
    #else
        return &heap[cursor];
    #endif

}