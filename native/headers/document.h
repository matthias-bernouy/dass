#ifndef DOCUMENT_H
#define DOCUMENT_H

#include "shared.h"
#include "errors.h"
#include "lockable.h"
#include "heap.h"

#define MAX_DOCUMENT_IN_SHARD_SHIFT 16 // 2^16 = 65,536 IDs per shard
#define MAX_DOCUMENT_IN_SHARD (1ULL << MAX_DOCUMENT_IN_SHARD_SHIFT)

// Should be dynamic
#define NB_ZONE 2
#define NB_SCHEMA 5

typedef struct {
    uint64_t shard_id; // Could be 152 132 179
    uint64_t counter; // no _Atomic because only one thread write in a shard
    uint64_t schema_id;
    alignas(CACHELINE_SIZE) aligned_lockable_element_t documents[MAX_DOCUMENT_IN_SHARD];
} Shard;

extern Map*              map_shards      [NB_ZONE]; 
extern aligned_counter_t shards_counters [NB_ZONE];

extern _Thread_local Shard* thread_shards[NB_ZONE][NB_SCHEMA];

typedef struct {
    uint64_t salt;
    uint16_t zone;
    uint32_t shard;
    uint16_t id;
} DocumentComposedID;


DocumentComposedID thread_generate_id_document(uint16_t zone, uint32_t schema_type);
void thread_new_shard_document(uint16_t zone, uint32_t schema_type);

#endif