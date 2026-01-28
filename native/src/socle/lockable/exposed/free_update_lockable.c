#include "lockable.h"
#include "heap.h"
#include "tx.h"

bool free_update_lockable(lockable_element_t *element, void* data, uint32_t length)
{
    uint64_t new_value = 0;
    uint64_t cursor = write_heap(data, length);
    new_value = pack_lockable(cursor, CONCURRENCY_STATUS_FREE);
    atomic_exchange_explicit(element, new_value, memory_order_release);
    free_lockable(element);
    return true;
}