#include "lockable.h"
#include "heap.h"

void* get_lockable(lockable_element_t *ele)
{
    MetadataConcurrencyElement metadata = wait_metadata_lockable(ele);
    return metadata.data;
}