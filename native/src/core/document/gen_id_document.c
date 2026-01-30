#include "document.h"
#include "lockable.h"

typedef struct {
    lockable_element_t* data;
    uint64_t schema_type;
} Document;

typedef struct {
    uint64_t shard_id; // Could be 152 132 179
    _Atomic uint64_t counter; // But max 65536, this is because of _Atomic alignment
    Document document_map[MAX_DOCUMENT_IN_SHARD];
} Shard;

typedef struct {
    _Atomic uint64_t actual_shard_to_fill; // Should be between 0 and DEFAULT_MAX_SHARD -1
    Shard shard_map[DEFAULT_MAX_SHARD];
} Zone;

extern Zone zone_map[DEFAULT_MAX_ZONE]; // Support up to 16 zones

DocumentComposedID gen_id_document(uint16_t zone){

    retry: 
        uint64_t shard_id = zone_map[zone].actual_shard_to_fill;
        DocumentComposedID id;
        id.id = (uint16_t) atomic_fetch_add(&zone_map[zone].shard_map[shard_id].counter, 1);

        if (id.id == 0xFFFF){
            select_new_shard(shard_id);
            goto retry;
        }
        id.salt = (uint64_t) rand();
        id.zone = zone;
        id.shard = zone_map[zone].actual_shard_to_fill;
    
}

void select_new_shard(uint64_t shard_id){
    // Change this method when decentralized shard selection is implemented
    // Use the calculation to see what is the next shard who the server is responsible for
    // For the moment, just increment the shard
    atomic_compare_exchange_strong_explicit(&zone_map[0].actual_shard_to_fill, &shard_id, (shard_id + 1), memory_order_seq_cst, memory_order_seq_cst);
}