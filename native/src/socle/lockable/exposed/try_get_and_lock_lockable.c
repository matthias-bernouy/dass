#include "lockable.h"
#include "heap.h"

void* try_get_and_lock_lockable(lockable_element_t *ele)
{
    MetadataConcurrencyElement metadata = wait_metadata_lockable(ele);
    bool locked = try_lock_lockable(ele);
    if (!locked) return NULL;
    return metadata.data;
}