#include "lockable.h"

/**
 * To use only when the lockable is already locked by the current thread.
 */
void free_lockable(lockable_element_t *actual_element)
{
    MetadataConcurrencyElement metadata = metadata_lockable(actual_element);
    uint64_t new_value = pack_lockable(metadata.cursor, CONCURRENCY_STATUS_FREE);
    atomic_exchange_explicit(actual_element, new_value, memory_order_release);
}