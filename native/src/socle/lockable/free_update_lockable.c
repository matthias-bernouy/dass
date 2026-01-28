#include "lockable.h"

bool free_update_lockable(atomic_element_t *actual_element, uint64_t cursor)
{

    uint64_t old_value, new_value, tries = 0;
    retry:
        old_value = atomic_load(actual_element);
        new_value = pack_lockable(cursor, CONCURRENCY_STATUS_FREE);
        if ( !atomic_compare_exchange_weak(actual_element, &old_value, new_value) ) {
            if (tries++ > CONCURRENCY_MAX_TRIES) {
                return false;
            }
            goto retry;
        }
    return true;
}