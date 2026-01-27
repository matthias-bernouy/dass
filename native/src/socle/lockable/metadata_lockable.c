#include "lockable.h"

MetadataConcurrencyElement metadata_lockable(atomic_element_t* val)
{
    uint64_t loaded_val = atomic_load_explicit(val, memory_order_acquire);
    MetadataConcurrencyElement metadata = {
        .cursor = loaded_val & CURSOR_MASK,
        .status = (CONCURRENCY_STATUS)(loaded_val >> STATUS_SHIFT)
    };
    return metadata;
}