#ifndef DOCUMENT_H
#define DOCUMENT_H

#include "shared.h"
#include "errors.h"

#define MAX_SHARD_SHIFT 32 // 2^32 = 4 Billion shards
#define MAX_SHARD      (1ULL << MAX_SHARD_SHIFT)

#define MAX_DOCUMENT_IN_SHARD_SHIFT 16 // 2^16 = 65,536 IDs per shard
#define MAX_DOCUMENT_IN_SHARD (1ULL << MAX_DOCUMENT_IN_SHARD_SHIFT)

#define DEFAULT_MAX_ZONE 4
#define DEFAULT_MAX_SHARD 16384


typedef struct {
    uint64_t salt;
    uint16_t zone;
    uint32_t shard;
    uint16_t id;
} DocumentComposedID;

#endif