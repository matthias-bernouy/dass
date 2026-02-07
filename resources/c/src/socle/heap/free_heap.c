#include "heap.h"

_Atomic cpt = 0;

void free_heap(void* data){

    heap_element* element = (heap_element*)((uint8_t*)data - sizeof(heap_element));
    atomic_fetch_add_explicit(&cpt, element->length, memory_order_relaxed);

    if (element->length != 128 ){
        printf("free_heap: freed length: %u\n", element->length);
    }


    memset(element, 0, element->length);

    
    //printf("TOTAL Freed: %lu\n", atomic_load_explicit(&cpt, memory_order_relaxed));

    if (data == NULL) {
        return;
    }
}