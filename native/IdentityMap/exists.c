#include "../headers/identity_map_headers.h"

ReturnCodes exists(const uint8_t *key, size_t length)
{
    uint64_t h = xxh32_fixed(key, length, 0);
    uint32_t index = (uint32_t)(h & HASHMAP_MASK);
    uint32_t max_iterations = 500;

    while (max_iterations--)
    {
        uint64_t slot_state = get_slot_state_with_comparing_hash(index, h);

        if (slot_state == SLOT_EQUALS) return EXISTS;
        if (slot_state == SLOT_AVAILABLE) return NOT_FOUND;
        if (slot_state == SLOT_DELETED || slot_state == SLOT_USED) {
            index = (index + 1) & HASHMAP_MASK;
            continue;
        }
        if (slot_state == SLOT_TIMEOUT) {
            return ERR_TIMEOUT;
        }
    }
    return ERR_MAX_ITERATION;
}