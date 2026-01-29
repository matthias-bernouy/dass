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
    uint64_t old_cursor;
    uint64_t new_cursor;
} LockableChangeElement;

typedef struct {
    uint64_t cursor;
    CONCURRENCY_STATUS status;
} MetadataConcurrencyElement;

typedef _Atomic uint64_t lockable_element_t;

// Internal Functions
bool try_lock_lockable(lockable_element_t *actual_element);
uint64_t pack_lockable(uint64_t cursor, uint8_t status);
MetadataConcurrencyElement wait_metadata_lockable(lockable_element_t* val);
MetadataConcurrencyElement metadata_lockable(lockable_element_t* val);

// Exposed Functions
FnResponse safe_total_update_lockable(lockable_element_t *actual_element, void* data, uint32_t length, uint64_t tx_id, uint64_t dep_tx_id);
bool free_lockable(lockable_element_t *actual_element);
bool free_update_lockable(lockable_element_t *element, void* data, uint32_t length);
void free_update_cursor_lockable(lockable_element_t *element, uint64_t cursor);

const void* get_lockable(lockable_element_t *ele);
const void* try_get_and_lock_lockable(lockable_element_t *ele);

#endif