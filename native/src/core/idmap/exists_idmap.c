#include "idmap.h"

FnResponse exists_idmap(const uint8_t *key, size_t length)
{
    uint64_t h = xxh32_fixed(key, length, 0);
    uint32_t index = (uint32_t)(h & ID_MAP_MASK);
    uint32_t max_iterations = 500;

    while (max_iterations--)
    {
        atomic_element_t* element = &identity_map[index];

        MetadataConcurrencyElement meta_start     = wait_metadata_lockable(element);
        const heap_element*        heap_element   = read_heap(meta_start.cursor);
        const IdentityMapElement*  element_data   = (const IdentityMapElement*)heap_element->data;

        FnResponse slot_state = slot_state_idmap(element_data, h);

        if (slot_state == RES_IDENTITY_MAP_SLOT_EQUALS) return RES_IDENTIFIER_EXISTS;
        if (slot_state == RES_IDENTITY_MAP_SLOT_AVAILABLE) return RES_IDENTIFIER_NOT_FOUND;
        if (slot_state == RES_IDENTITY_MAP_SLOT_DELETED || slot_state == RES_IDENTITY_MAP_SLOT_USED) {
            index = (index + 1) & ID_MAP_MASK;
            continue;
        }
        if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) {
            return RES_SYS_ERR_TIMEOUT;
        }
    }
    return RES_SYS_ERR_TIMEOUT;
}