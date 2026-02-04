#include "lockable.h"
#include "heap.h"
#include "tx.h"

FnResponse safe_total_update_lockable(lockable_element_t *element, void* data, uint32_t length, uint64_t tx_id, uint64_t dep_tx_id)
{
    void* old_data = metadata_lockable(element).data;
    void* new_data = write_heap(data, length);

    FnResponse res_add_operation = add_operation_tx(old_data, new_data, element, tx_id, dep_tx_id);
    if ( !res_add_operation ) {
        free_lockable(element);
        free_heap(new_data);
        return res_add_operation;
    }

    free_lockable(element);

    return true;
}