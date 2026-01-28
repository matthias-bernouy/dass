#include "heap.h"

const heap_element* read_heap(uint64_t cursor){

    #ifdef DEV_MODE
        heap_element* element = (heap_element*) &heap[cursor];
        assert(element != NULL);
        assert(element->length > 0);
        uint64_t read_only_element = write_heap(element->data, element->length);
        assert(read_only_element != RES_WRITE_MEMORY_ERROR);
        return (const heap_element*)&heap[read_only_element];
    #else
        return (const heap_element*)&heap[cursor];
    #endif
    
}