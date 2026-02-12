#ifndef SYSTEM_H
#define SYSTEM_H

#include "shared.h"
#include "errors.h"

// All variables here should be set with MakeFile with -D flags

#define APP_SEED [125, 34, 87, 192, 45, 67, 89, 23]

#define SERVER_ID 0

#define SERVER_MAJOR_VERSION 0
#define SERVER_MINOR_VERSION 1
#define SERVER_PATCH_VERSION 0

extern _Thread_local uint64_t thread_rng_seed;

bool im_shard_manager(uint16_t zone_id, uint32_t shard_id);

#endif