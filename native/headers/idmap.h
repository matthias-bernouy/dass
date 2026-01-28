#ifndef ID_MAP_H
#define ID_MAP_H

#include "shared.h"
#include "tx.h"
#include "lockable.h"
#include "heap.h"
#include "errors.h"

#define ID_MAP_SIZE_SHIFT 24 // 16 642 177 entries
#define ID_MAP_SIZE (1 << ID_MAP_SIZE_SHIFT)
#define ID_MAP_MASK (ID_MAP_SIZE - 1)

typedef enum {
    ID_MAP_ELEMENT_AVAILABLE = 0,
    ID_MAP_ELEMENT_USED      = 1,
    ID_MAP_ELEMENT_DELETED   = 2
} ID_MAP_ELEMENT_STATUS;

typedef struct
{
    ID_MAP_ELEMENT_STATUS status;
    uint64_t transaction_id;
    uint64_t hash;
    uint64_t value;
} IdentityMapElement;

typedef lockable_element_t IdentityMap;

// Global Variables
extern IdentityMap identity_map[ID_MAP_SIZE];

// Internal Functions
FnResponse slot_state_idmap(const IdentityMapElement* element, const uint64_t hash);

// Exposed Functions
FnResponse exists_idmap    (const uint8_t *key, size_t length);
FnResponse link_idmap      (const uint8_t *key, size_t length, uint64_t value, uint64_t id_transaction);
FnResponse unlink_idmap    (const uint8_t *key, size_t length, uint64_t id_transaction);

#endif