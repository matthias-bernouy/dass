#ifndef IDENTITY_MAP_SYSTEM_H
#define IDENTITY_MAP_SYSTEM_H

#include "./transaction_headers.h"

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
    _Atomic uint64_t current_transaction_id;
    HashIdentityData persistent_data;
    HashIdentityData staged_data;
} HashIdentityTransactionController;

extern _Atomic uint64_t counter_identity_map;
extern HashIdentityTransactionController identity_hashed_map[HASHMAP_SIZE];

FnResponse get_slot_state_with_comparing_hash_identity_map(const uint32_t index, const uint64_t hash);
FnResponse key_exists_identity_map(const uint8_t *key, size_t length);
FnResponse link_key_identity_map(const uint8_t *key, size_t length, uint64_t value, uint64_t id_transaction);
FnResponse transaction_provider_identity_map(PayloadTransaction* payload, TX_STATUS tx_status);

#endif