#include "Headers/heap_headers.h"

const memory_element* read_memory(uint64_t cursor){
    return (const memory_element*)&heap_memory[cursor];
}