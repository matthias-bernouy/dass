#ifndef IDENTITY_MAP_SYSTEM_H
#define IDENTITY_MAP_SYSTEM_H

#include "./shared_headers.h"
#include "./concurrency_element_headers.h"

#define BASE_HEAP_SIZE 32 // 2^32 = 4 GB
#define BASE_RESERVATION_PER_THREAD 24 // 2^24 = 16 MB

typedef struct {
    uint8_t status;
    uint32_t length;
    uint8_t data[];
} memory_element;

extern uint8_t heap_memory[1ULL << BASE_HEAP_SIZE];
extern _Atomic uint64_t heap_cursor;
extern uint64_t heap_size;
extern uint64_t heap_free_if_full_compaction;

extern _Thread_local uint64_t thread_reservation_cursor;
extern _Thread_local uint64_t thread_reservation_limit;

void thread_reservation_memory();
uint64_t write_memory(uint8_t* data, uint64_t length); // set to used status and write data and return cursor
void free_memory(uint64_t cursor); // set to deleted status
const memory_element* read_memory(uint64_t cursor);

#endif