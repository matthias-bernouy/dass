#ifndef HEAP_H
#define HEAP_H

#include "shared.h"
#include "errors.h"

#define BASE_HEAP_SIZE_SHIFT 31 // 2^34 = 16 GB
#define BASE_RESERVATION_PER_THREAD_SHIFT 29 // 2^29 = 512 MB

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

// Thread variables and functions
extern _Thread_local uint64_t thread_reservation_cursor;
extern _Thread_local uint64_t thread_reservation_limit;
void thread_reservation_heap();

// Exposed Functions
void*           write_heap(void* data, uint32_t length);
void*           calloc_heap(uint32_t length);
void            free_heap(void* data);

#endif