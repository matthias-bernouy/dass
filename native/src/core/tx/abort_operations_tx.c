#include "tx.h"

FnResponse abort_operations_tx(TxOperation* operations, uint32_t operation_count)
{
    for (uint32_t i = 0; i < operation_count; i++) {
        TxOperation* operation = &operations[i];
        lockable_element_t* target = operation->target;

        retry:
        bool locked = try_lock_lockable(target);
        if (!locked) goto retry;
        free_update_cursor_lockable(target, operation->old_heap_cursor);
    }
    return RES_STANDARD_TRUE;
}