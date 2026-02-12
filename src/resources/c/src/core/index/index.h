#ifndef INDEX_H
#define INDEX_H

// To implement a simple index structure
// For now only used for schema index in shards

// !!! Not implemented yet !!!

#include "shared.h"
#include "errors.h"
#include "lockable.h"

typedef struct {
    locker_t  locker;
    counter_t count;
    uint64_t  list_size;
    uint64_t* list_ptrs;
} Index;

Index* create_index(uint64_t initial_size);
void   resize_index(Index* index, uint64_t new_size);

void  add_ptr_index(Index* index, uint64_t ptr);
void  del_ptr_index(Index* index, uint64_t ptr);

#endif