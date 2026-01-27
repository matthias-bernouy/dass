#ifndef LOCKABLE_H
#define LOCKABLE_H

#include "shared.h"

#define STATUS_MASK 0xFF00000000000000
#define CURSOR_MASK 0x00FFFFFFFFFFFFFF
#define STATUS_SHIFT 56

#define CONCURRENCY_MAX_TRIES 1000

typedef enum {
    CONCURRENCY_STATUS_FREE   = 0,
    CONCURRENCY_STATUS_LOCKED = 1
} CONCURRENCY_STATUS;

typedef struct {
    uint64_t cursor;
    CONCURRENCY_STATUS status;
} MetadataConcurrencyElement;

typedef _Atomic uint64_t atomic_element_t;

// Internal Functions


// Exposed Functions
MetadataConcurrencyElement wait_metadata_lockable(atomic_element_t* val);
MetadataConcurrencyElement metadata_lockable(atomic_element_t* val);
uint64_t pack_lockable(uint64_t cursor, uint8_t status);
void free_update_lockable(atomic_element_t *actual_element, uint64_t cursor);
void free_lockable(atomic_element_t *actual_element);
bool try_lock_lockable(atomic_element_t *actual_element);
bool equals_lockable(MetadataConcurrencyElement metadata1, MetadataConcurrencyElement metadata2);


#endif