#include "map.h"

FnResponse link_map(Map* map, uint64_t identifier, uint64_t value)
{
    // check if need to resize map (not implemented yet)
    // lock the map, resize, recalculate positions, unlock the map
    // or an other thread can do it (probably better)

    const uint64_t map_size = map->size;
    const uint64_t hashed_id = hash_u64(identifier);
    const uint64_t base_index = hashed_id % map_size;
    uint64_t tries = 0;

    for (size_t i = 0; i < 128; i++)
    {
        MapEntry* entry = &map->entries[(base_index + i) % map_size];

        // if already locked, wait
        if ( entry->locker == LOCKER_LOCKED ) {
            _mm_pause();
            i--;
            tries++;
            if (tries > 128) {
                return RES_SYS_ERR_TIMEOUT;
            }
            continue;
        }

        // Get the lock or continue
        uint64_t expected = LOCKER_FREE;
        bool res = atomic_compare_exchange_strong(&entry->locker, &expected, LOCKER_LOCKED);
        if ( !res ) { 
            i--;
            continue;
        }

        // Already exists identifier
        if (entry->status == MAP_ELEMENT_USED && entry->identifier == identifier) {
            atomic_store_explicit(&entry->locker, LOCKER_FREE, memory_order_release);
            return RES_STANDARD_FALSE;
        }

        // Available slot case
        if (entry->status == MAP_ELEMENT_AVAILABLE || entry->status == MAP_ELEMENT_DELETED) {
            entry->identifier = identifier;
            entry->value = value;
            entry->status = MAP_ELEMENT_USED;
            atomic_store_explicit(&entry->locker, LOCKER_FREE, memory_order_release);
            return RES_STANDARD_TRUE;
        }
    }

    return RES_SYS_ERR_MAX_ITERATION;
}