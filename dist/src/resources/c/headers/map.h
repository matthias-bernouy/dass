#ifndef MAP_H
#define MAP_H

#include "shared.h"
#include "errors.h"
#include "lockable.h"

typedef enum {
    MAP_ELEMENT_AVAILABLE = 0,
    MAP_ELEMENT_USED      = 1,
    MAP_ELEMENT_DELETED   = 2
} MAP_ELEMENT_STATUS;

typedef struct MapEntry
{
    locker_t locker;
    uint64_t status;
    uint64_t identifier;
    uint64_t value;
} MapEntry;

typedef struct {
    MapEntry* entries;
    uint64_t  size;
} Map;

Map* create_map(uint64_t initial_size);
// Map* resize_map(Map* old_map);

FnResponse exists_map    (Map* map, uint64_t identifier);
FnResponse link_map      (Map* map, uint64_t identifier, uint64_t value);
FnResponse unlink_map    (Map* map, uint64_t identifier);
uint64_t   get_map       (Map* map, uint64_t identifier);

#endif