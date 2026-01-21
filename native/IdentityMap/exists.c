#include "../headers/identity_map_headers.h"

FnResponse exists(const uint8_t *key, size_t length)
{
    uint64_t h = xxh32_fixed(key, length, 0);
    uint32_t index = (uint32_t)(h & HASHMAP_MASK);
    uint32_t max_iterations = 500;

    while (max_iterations--)
    {
        FnResponse slot_state = get_slot_state_with_comparing_hash(index, h);

        if (slot_state == RES_IDENTITY_MAP_SLOT_EQUALS) return RES_IDENTIFIER_EXISTS;
        if (slot_state == RES_IDENTITY_MAP_SLOT_AVAILABLE) return RES_IDENTIFIER_NOT_FOUND;
        if (slot_state == RES_IDENTITY_MAP_SLOT_DELETED || slot_state == RES_IDENTITY_MAP_SLOT_USED) {
            index = (index + 1) & HASHMAP_MASK;
            continue;
        }
        if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) {
            return RES_SYS_ERR_TIMEOUT;
        }
    }
    return RES_SYS_ERR_TIMEOUT;
}