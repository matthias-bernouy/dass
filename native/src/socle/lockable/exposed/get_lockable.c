#include "lockable.h"
#include "heap.h"

const void* get_lockable(lockable_element_t *ele)
{
    MetadataConcurrencyElement metadata = wait_metadata_lockable(ele);
    if (metadata.cursor == 0) return NULL;

    printf("ADRESSE REELLE DATA LUE    : %p\n", (void*)get_ptr_heap(metadata.cursor));
    return get_ptr_heap(metadata.cursor);
}