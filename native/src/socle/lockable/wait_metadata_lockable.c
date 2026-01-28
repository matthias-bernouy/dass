#include "lockable.h"

/**
 * 
 * Waits until the concurrency element is not locked and retrieves its metadata.
 * If the element remains locked after a maximum number of tries, it returns the metadata anyway.
 */
MetadataConcurrencyElement wait_metadata_lockable(lockable_element_t* val)
{
    uint64_t loaded_val;
    uint32_t try_count = 0;
    MetadataConcurrencyElement metadata;

    retry:
        loaded_val = atomic_load_explicit(val, memory_order_acquire);
        metadata.cursor = loaded_val & CURSOR_MASK;
        metadata.status = (CONCURRENCY_STATUS)(loaded_val >> STATUS_SHIFT);
        if (metadata.status != CONCURRENCY_STATUS_LOCKED) {
            return metadata;
        }
        if (++try_count > CONCURRENCY_MAX_TRIES) {
            return metadata;
        }
        goto retry;
    
}