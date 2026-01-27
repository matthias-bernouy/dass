#include "lockable.h"

bool try_lock_lockable(atomic_element_t *actual_element)
{
    uint64_t old_value, new_value;

    old_value = atomic_load(actual_element);
    MetadataConcurrencyElement metadata = wait_metadata_lockable(actual_element);
    metadata.status = CONCURRENCY_STATUS_LOCKED;
    new_value = pack_lockable(metadata.cursor, metadata.status);

    return atomic_compare_exchange_strong_explicit(
        actual_element,
        &old_value,
        new_value,
        memory_order_acq_rel,
        memory_order_relaxed);
    
}