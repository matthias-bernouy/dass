#include "lockable.h"
#include "heap.h"
#include "tx.h"

/**
 * To use only when the lockable is already locked by the current thread.
 */
void free_update_cursor_lockable(lockable_element_t *element, uint64_t cursor)
{
    uint64_t new_value = 0;
    new_value = pack_lockable(cursor, CONCURRENCY_STATUS_FREE);
    atomic_exchange_explicit(element, new_value, memory_order_release);
}