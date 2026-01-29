#include "lockable.h"
#include "heap.h"
#include "tx.h"

FnResponse safe_total_update_lockable(lockable_element_t *element, void* data, uint32_t length, uint64_t tx_id, uint64_t dep_tx_id)
{
    uint64_t old_value = atomic_load(element);
    uint64_t cursor = write_heap(data, length);

    FnResponse res_add_operation = add_operation_tx(old_value & CURSOR_MASK, cursor, element, tx_id, dep_tx_id);
    if ( !res_add_operation ) {
        free_lockable(element);
        free_heap(cursor);
        return res_add_operation;
    }

    free_update_cursor_lockable(element, cursor);

    return true;
}