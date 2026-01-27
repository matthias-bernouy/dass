#include "lockable.h"

void free_lockable(atomic_element_t *actual_element)
{
    uint64_t old_value, new_value;
    do
    {
        MetadataConcurrencyElement metadata = wait_metadata_lockable(actual_element);
        new_value = pack_lockable(metadata.cursor, CONCURRENCY_STATUS_FREE);
    } while (!atomic_compare_exchange_weak(actual_element, &old_value, new_value));
}