#ifndef HEAP_H
#define HEAP_H

#include "shared.h"
#include "errors.h"

#define BASE_HEAP_SIZE_SHIFT 34 // 2^34 = 16 GB
#define BASE_RESERVATION_PER_THREAD_SHIFT 28 // 2^28 = 256 MB

#define BASE_HEAP_SIZE (1ULL << BASE_HEAP_SIZE_SHIFT)
#define BASE_RESERVATION_PER_THREAD (1ULL << BASE_RESERVATION_PER_THREAD_SHIFT)

typedef enum {
    HEAP_STATUS_FREE    = 0,
    HEAP_STATUS_USED    = 1
} HEAP_STATUS;

typedef struct {
    uint8_t status;
    uint32_t length;
    uint8_t data[];
} heap_element;

// Global Variables
extern uint8_t          heap[BASE_HEAP_SIZE];
extern _Atomic uint64_t heap_cursor;
extern uint64_t         heap_size;

// Thread variables
extern _Thread_local uint64_t thread_reservation_cursor;
extern _Thread_local uint64_t thread_reservation_limit;

// Internal Functions
void reservation_heap();

// Exposed Functions
uint64_t        write_heap(void* data, uint32_t length);
void*           calloc_heap(uint32_t length);
void            free_heap(uint64_t cursor);
void*           get_ptr_heap(uint64_t cursor);

#endif