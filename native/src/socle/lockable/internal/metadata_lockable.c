#include "lockable.h"

MetadataConcurrencyElement metadata_lockable(lockable_element_t* val)
{
    uint64_t loaded_val = atomic_load_explicit(val, memory_order_acquire);
    MetadataConcurrencyElement metadata = {
        .data = (void*)(loaded_val & POINTER_MASK),
        .status = (CONCURRENCY_STATUS)(loaded_val & STATUS_BIT_MASK)
    };
    return metadata;
}