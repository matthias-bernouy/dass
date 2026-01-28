#include "idmap.h"

FnResponse link_idmap(const uint8_t *key, size_t length, uint64_t value, uint64_t _tx_id)
{
    uint64_t h = xxh32_fixed(key, length, 0);
    uint32_t start_index = (uint32_t)(h & ID_MAP_MASK);
    uint32_t current_index = start_index;
    uint64_t tries = 0;

    while (tries < CONCURRENCY_MAX_TRIES)
    {

        lockable_element_t* element = &identity_map[current_index];

        MetadataConcurrencyElement meta_start     = wait_metadata_lockable(element);
        assert(meta_start.status == CONCURRENCY_STATUS_FREE || meta_start.status == CONCURRENCY_STATUS_LOCKED);

        if (meta_start.status != CONCURRENCY_STATUS_FREE) {
            _mm_pause();
            tries++;
            continue;
        }

        uint64_t id_tx = IDENTIFIER_EMPTY;
        if ( meta_start.cursor > IDENTIFIER_START_INDEX ) {
            const heap_element*        heap_element   = read_heap(meta_start.cursor);
            assert(heap_element != NULL);
            assert(heap_element->length == sizeof(IdentityMapElement));

            const IdentityMapElement*  element_data   = (const IdentityMapElement*)heap_element->data;
            assert(element_data != NULL);
            assert(element_data->transaction_id == 0 || element_data->transaction_id > 1000);

            id_tx = element_data->transaction_id;

            FnResponse slot_state = slot_state_idmap(element_data, h);
            if (slot_state == RES_IDENTITY_MAP_SLOT_EQUALS) return RES_IDENTIFIER_EXISTS;
            if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) return RES_SYS_ERR_TIMEOUT;
            if (slot_state == RES_IDENTITY_MAP_SLOT_USED) {
                current_index = (current_index + 1) & ID_MAP_MASK;
                tries++;
                continue;
            }
        }

        bool res = try_lock_lockable(element);
        if ( !res ) {
            _mm_pause();
            tries++;
            continue;
        };

        MetadataConcurrencyElement meta_end = metadata_lockable(element);
        if ( meta_start.cursor != meta_end.cursor ) {
            free_lockable(element);
            _mm_pause();
            tries++;
            continue;
        }

        IdentityMapElement new_data = {
            .hash = h,
            .value = value,
            .transaction_id = _tx_id,
            .status = ID_MAP_ELEMENT_USED
        };

        uint64_t new_cursor = write_heap(&new_data, sizeof(IdentityMapElement));
        if ( is_id_error(new_cursor) ) {
            free_lockable(element);
            return (FnResponse) new_cursor;
        }

        FnResponse res_add_operation = add_operation_tx(meta_end.cursor, new_cursor, element, _tx_id, id_tx);
        if ( !res_add_operation ) {
            free_lockable(element);
            return res_add_operation;
        }

        bool res_free_update_lockable = free_update_lockable(element, new_cursor);
        assert(res_free_update_lockable == true);

        return true;
    }

    assert(false);
    return RES_SYS_ERR_MAX_ITERATION;
}