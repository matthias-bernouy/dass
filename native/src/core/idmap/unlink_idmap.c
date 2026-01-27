#include "idmap.h"

FnResponse unlink_idmap(const uint8_t *key, size_t length, uint64_t id_transaction)
{
    uint64_t h = xxh32_fixed(key, length, 0);
    uint32_t start_index = (uint32_t)(h & ID_MAP_MASK);
    uint32_t current_index = start_index;

    while (1)
    {
        atomic_element_t* element = &identity_map[current_index];

        MetadataConcurrencyElement meta_start     = wait_metadata_lockable(element);
        const heap_element*        heap_element   = read_heap(meta_start.cursor);
        const IdentityMapElement*  element_data   = (const IdentityMapElement*)heap_element->data;

        FnResponse slot_state = slot_state_idmap(element_data, h);
        if (slot_state == RES_IDENTITY_MAP_SLOT_AVAILABLE) return RES_IDENTIFIER_NOT_FOUND;
        if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) return RES_SYS_ERR_TIMEOUT;
        if (slot_state == RES_IDENTITY_MAP_SLOT_USED) {
            current_index = (current_index + 1) & ID_MAP_MASK;
            continue;
        }
        bool res = try_lock_lockable(element);
        if ( !res ) continue;

        MetadataConcurrencyElement meta_end = metadata_lockable(element);
        if ( meta_start.cursor != meta_end.cursor ) {
            free_lockable(element);
            continue;
        }

        IdentityMapElement new_data = {
            .hash = 0x0000000000000000ULL,
            .value = 0x0000000000000000ULL,
            .transaction_id = id_transaction,
            .status = ID_MAP_ELEMENT_DELETED
        };

        uint64_t new_cursor = write_heap(&new_data, sizeof(IdentityMapElement));
        if (new_cursor == RES_WRITE_MEMORY_ERROR) {
            free_lockable(element);
            return RES_WRITE_MEMORY_ERROR;
        }

        free_update_lockable(element, new_cursor);

        return RES_STANDARD_TRUE;

    }
    return RES_SYS_ERR_MAX_ITERATION;
}