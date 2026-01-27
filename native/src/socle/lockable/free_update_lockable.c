#include "lockable.h"

void free_update_lockable(atomic_element_t *actual_element, uint64_t cursor)
{
    uint64_t old_value, new_value;
    do
    {
        old_value = atomic_load(actual_element);
        new_value = pack_lockable(cursor, CONCURRENCY_STATUS_FREE);
    } while (!atomic_compare_exchange_weak(actual_element, &old_value, new_value));
}