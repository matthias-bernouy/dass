#ifndef CONCURRENCY_ELEMENT_HEADERS_H
#define CONCURRENCY_ELEMENT_HEADERS_H

#include "./shared_headers.h"

#define STATUS_MASK 0xFF00000000000000
#define CURSOR_MASK 0x00FFFFFFFFFFFFFF
#define STATUS_SHIFT 56

typedef enum {
    CONCURRENCY_STATUS_FREE   = 0,
    CONCURRENCY_STATUS_LOCKED = 1
} CONCURRENCY_STATUS;

typedef _Atomic uint64_t atomic_element_t;

uint64_t get_cursor_element(atomic_element_t val);
CONCURRENCY_STATUS get_status_element(atomic_element_t val);
uint64_t pack_element(uint64_t cursor, uint8_t status);
void free_element_with_new_cursor_element(atomic_element_t *actual_element, uint64_t cursor);
void lock_element(atomic_element_t *actual_element);

#endif