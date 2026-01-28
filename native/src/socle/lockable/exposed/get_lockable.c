#include "lockable.h"
#include "heap.h"

const void* get_lockable(lockable_element_t *ele)
{
    MetadataConcurrencyElement metadata = wait_metadata_lockable(ele);
    if (metadata.cursor == 0) return NULL;
    return get_ptr_heap(metadata.cursor);
}