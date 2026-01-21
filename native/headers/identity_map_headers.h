#ifndef IDENTITY_MAP_SYSTEM_H
#define IDENTITY_MAP_SYSTEM_H

#include "./transaction_headers.h"

#define SLOT_AVAILABLE  ( 0 << 1 )
#define SLOT_DELETED    ( 1 << 1 )
#define SLOT_USED       ( 2 << 1 )
#define SLOT_EQUALS     ( 3 << 1 )
#define SLOT_TIMEOUT    ( 4 << 1 )

#define DELETED_SLOT_HASH 0XFFFFFFFFFFFFFFFF
#define EMPTY_SLOT_HASH 0x0000000000000000

#define HASHMAP_SIZE_SHIFT 24 // 16 642 177 entries
#define HASHMAP_SIZE (1 << HASHMAP_SIZE_SHIFT)
#define HASHMAP_MASK (HASHMAP_SIZE - 1)

typedef struct
{
    uint64_t hash;  // based on the key
    uint64_t value; // identifier associated
} HashIdentityData;

typedef struct
{
    _Atomic uint64_t status;
    uint64_t current_transaction_id;
    HashIdentityData persistent_data;
    HashIdentityData staged_data;
} HashIdentityTransactionController;

extern _Atomic uint64_t counter_identity_map;
extern HashIdentityTransactionController identity_hashed_map[HASHMAP_SIZE];

uint64_t get_slot_state_with_comparing_hash(const uint32_t index, const uint64_t hash);
ReturnCodes exists(const uint8_t *key, size_t length);
ReturnCodes link(const uint8_t *key, size_t length, uint64_t value, uint64_t id_transaction);
TX_RESPONSE identity_map_provider_transaction(PayloadTransaction* payload, TX_STATUS tx_status);

#endif