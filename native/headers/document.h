#ifndef DOCUMENT_H
#define DOCUMENT_H

#include "shared.h"
#include "errors.h"
#include "lockable.h"

#define MAX_SHARD_SHIFT 32 // 2^32 = 4 Billion shards
#define MAX_SHARD      (1ULL << MAX_SHARD_SHIFT)

#define MAX_DOCUMENT_IN_SHARD_SHIFT 16 // 2^16 = 65,536 IDs per shard
#define MAX_DOCUMENT_IN_SHARD (1ULL << MAX_DOCUMENT_IN_SHARD_SHIFT)

#define DEFAULT_MAX_SHARD (1ULL << 24)

#define NB_ZONE 2
#define NB_SCHEMA 5

typedef struct {
    uint64_t shard_id; // Could be 152 132 179
    uint64_t counter; // no _Atomic because only one thread write in a shard
    alignas(CACHELINE_SIZE) aligned_lockable_element_t documents[MAX_DOCUMENT_IN_SHARD];
} Shard;


extern Shard* shards_map[NB_ZONE][DEFAULT_MAX_SHARD];
extern aligned_counter_t shards_pagination_counter[NB_ZONE][NB_SCHEMA];

extern _Thread_local Shard* thread_shards[NB_ZONE][NB_SCHEMA];

typedef struct {
    uint64_t salt;
    uint16_t zone;
    uint32_t shard;
    uint16_t id;
} DocumentComposedID;


DocumentComposedID thread_gen_document_id(uint16_t zone, uint32_t schema_type);
lockable_element_t* get_document_ptr(DocumentComposedID doc_id);
bool init_schema_shards_counters();
void test();

#endif