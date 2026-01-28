#include "heap.h"

void free_heap(uint64_t cursor){
    heap_element* element = (heap_element*)&heap[cursor];
    element->status = 2;
}