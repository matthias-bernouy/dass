#include "lockable.h"
#include "heap.h"
#include "tx.h"

/**
 * To use only when the lockable is already locked by the current thread.
 */
void free_update_lockable(lockable_element_t *element, void* data, uint32_t length)
{
    uint64_t new_value = 0;
    void* ptr = write_heap(data, length);
    new_value = pack_lockable(ptr, CONCURRENCY_STATUS_FREE);
    atomic_exchange_explicit(element, new_value, memory_order_release);
}