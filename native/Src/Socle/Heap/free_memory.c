#include "Headers/heap_headers.h"

void free_memory(uint64_t cursor){
    memory_element* element = (memory_element*)&heap_memory[cursor];
    element->status = 2;
}