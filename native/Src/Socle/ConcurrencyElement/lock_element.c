#include "Headers/concurrency_element_headers.h"

void lock_element(atomic_element_t *actual_element)
{
    uint64_t old_value, new_value;
    do
    {
        old_value = atomic_load(actual_element);
        uint64_t cursor = get_cursor_element(old_value);
        new_value = pack_element(cursor, CONCURRENCY_STATUS_LOCKED);
    } while (!atomic_compare_exchange_weak(actual_element, &old_value, new_value));
}