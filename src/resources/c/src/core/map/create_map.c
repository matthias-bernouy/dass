#include "map.h"
#include "heap.h"

Map* create_map(uint64_t initial_size){

    size_t total_size_entries = initial_size * sizeof(MapEntry);
    size_t total_size_map = sizeof(Map);

    MapEntry* entries = calloc_heap(total_size_entries);
    Map*      map     = calloc_heap(total_size_map);

    if (!map || !entries) return NULL;
    map->size = initial_size;
    map->entries = entries; 

    return map;
}