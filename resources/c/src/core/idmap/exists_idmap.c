#include "idmap.h"

FnResponse exists_idmap(const uint8_t *key, size_t length)
{
    uint64_t h = xxh64_fixed(key, length, 0);
    uint32_t index = (uint32_t)(h & ID_MAP_MASK);
    // __builtin_prefetch(&identity_map[index], 0, 3);
    // __builtin_prefetch(&identity_map[(index + 1) & ID_MAP_MASK], 0, 3);
    // __builtin_prefetch(&identity_map[(index + 2) & ID_MAP_MASK], 0, 3);
    uint32_t tries = 0;


    while (tries++ < CONCURRENCY_MAX_TRIES)
    {
        //__builtin_prefetch(&identity_map[(index + 3) & ID_MAP_MASK], 0, 3);
        lockable_element_t* element = &identity_map[index];
        const IdentityMapElement*  element_data   = (const IdentityMapElement*)get_lockable(element);

        if ( element_data == NULL ) {
            return false;
        }

        FnResponse slot_state = slot_state_idmap(element_data, h);

        if (slot_state == RES_IDENTITY_MAP_SLOT_EQUALS) return true;
        if (slot_state == RES_IDENTITY_MAP_SLOT_AVAILABLE) return false;
        if (slot_state == RES_IDENTITY_MAP_SLOT_DELETED || slot_state == RES_IDENTITY_MAP_SLOT_USED) {
            index = (index + 1) & ID_MAP_MASK;
            continue;
        }
        if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) {
            return RES_SYS_ERR_TIMEOUT;
        }
    }
    assert(false);
    return RES_SYS_ERR_MAX_ITERATION;
}