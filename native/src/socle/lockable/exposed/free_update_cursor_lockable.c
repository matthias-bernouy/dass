#include "lockable.h"
#include "heap.h"
#include "tx.h"

bool free_update_cursor_lockable(lockable_element_t *element, uint64_t cursor)
{
    uint64_t new_value = 0;
    new_value = pack_lockable(cursor, CONCURRENCY_STATUS_FREE);
    atomic_exchange_explicit(element, new_value, memory_order_release);
    free_lockable(element);
    return true;
}