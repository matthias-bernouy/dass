#include "heap.h"

const heap_element* read_heap(uint32_t cursor){
    return (const heap_element*)&heap[cursor];
}