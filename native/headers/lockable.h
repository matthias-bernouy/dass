#ifndef LOCKABLE_H
#define LOCKABLE_H

#include "shared.h"
#include "errors.h"

// 48 bits pour le curseur (256 To max)
#define CURSOR_MASK  0x0000FFFFFFFFFFFFULL 

// 16 bits pour le statut (situés tout en haut)
#define STATUS_MASK  0xFFFF000000000000ULL
#define STATUS_SHIFT 48

#define CONCURRENCY_MAX_TRIES 1000

typedef enum {
    CONCURRENCY_STATUS_FREE   = 0,
    CONCURRENCY_STATUS_LOCKED = 1
} CONCURRENCY_STATUS;

typedef struct {
    uint64_t cursor;
    CONCURRENCY_STATUS status;
} MetadataConcurrencyElement;

typedef _Atomic uint64_t lockable_element_t;

// Internal Functions


// Exposed Functions
MetadataConcurrencyElement wait_metadata_lockable(lockable_element_t* val);
MetadataConcurrencyElement metadata_lockable(lockable_element_t* val);
uint64_t pack_lockable(uint64_t cursor, uint8_t status);
bool free_update_lockable(lockable_element_t *actual_element, uint64_t cursor);
bool free_lockable(lockable_element_t *actual_element);
bool try_lock_lockable(lockable_element_t *actual_element);


#endif