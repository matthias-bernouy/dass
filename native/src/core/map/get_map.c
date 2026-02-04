#include "map.h"

uint64_t get_map(Map* map, uint64_t identifier)
{
    const uint64_t map_size = map->size;
    const uint64_t hashed_id = hash_u64(identifier);
    const uint64_t base_index = hashed_id % map_size;
    uint64_t tries = 0;

    for (size_t i = 0; i < 128; i++)
    {
        MapEntry* entry = &map->entries[(base_index + i) % map_size];

        if (entry->locker == LOCKER_LOCKED) {
            _mm_pause();
            i--;
            tries++;
            if (tries > 128) {
                return 0XFFFFFFFFFFFFFFFFULL;
            }
            continue;
        }

        if (entry->status == MAP_ELEMENT_AVAILABLE) {
            return 0XFFFFFFFFFFFFFFFFULL;
        }

        if (entry->status == MAP_ELEMENT_USED && entry->identifier == identifier) {
            return entry->value;
        }

    }

    return 0XFFFFFFFFFFFFFFFFULL;
}