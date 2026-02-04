#ifndef LOCKABLE_H
#define LOCKABLE_H

#include "shared.h"
#include "errors.h"

#define STATUS_BIT_MASK (1ULL << 63)
#define POINTER_MASK (~STATUS_BIT_MASK)

#define CONCURRENCY_MAX_TRIES 1000

typedef enum {
    LOCKER_FREE   = 0,
    LOCKER_LOCKED = 1
} LOCKER_STATUS;
typedef _Atomic uint64_t locker_t; // 0 = free | 1 = locked

typedef enum {
    CONCURRENCY_STATUS_FREE   = 0,
    CONCURRENCY_STATUS_LOCKED = 1
} CONCURRENCY_STATUS;

typedef struct {
    void* data;
    CONCURRENCY_STATUS status;
} MetadataConcurrencyElement;

typedef _Atomic uint64_t lockable_element_t; // first bit is lock status, other bits are pointer (1/63)
typedef struct {
    alignas(CACHELINE_SIZE) lockable_element_t element;
} aligned_lockable_element_t;

// Internal Functions
bool try_lock_lockable(lockable_element_t *actual_element);
uint64_t pack_lockable(void* data_ptr, uint8_t status);
MetadataConcurrencyElement wait_metadata_lockable(lockable_element_t* val);
MetadataConcurrencyElement metadata_lockable(lockable_element_t* val);

// Exposed Functions
FnResponse safe_total_update_lockable(lockable_element_t *actual_element, void* data, uint32_t length, uint64_t tx_id, uint64_t dep_tx_id);
void free_lockable(lockable_element_t *actual_element);
void free_update_lockable(lockable_element_t *element, void* data, uint32_t length);

void* get_lockable(lockable_element_t *ele);
void* try_get_and_lock_lockable(lockable_element_t *ele);

#endif