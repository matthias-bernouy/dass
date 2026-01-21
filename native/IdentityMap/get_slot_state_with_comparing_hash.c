#include "../headers/identity_map_headers.h"

uint64_t get_slot_state_with_comparing_hash(const uint32_t index, const uint64_t hash)
{
    uint32_t max_iterations = 1024;
    uint32_t return_status = SLOT_AVAILABLE;
    uint64_t timestamp = 0x000000000000000;

    while (max_iterations--)
    {
        uint64_t status = get_status(&identity_hashed_map[index].status);
        uint64_t hash_in_slot;
        uint64_t current_transaction_id = atomic_load_explicit(&identity_hashed_map[index].current_transaction_id, memory_order_acquire);

        if (status == TX_ELEMENT_STAGED){
            hash_in_slot = identity_hashed_map[index].staged_data.hash;
        } else if (status == TX_ELEMENT_LOCKED){
            uint64_t timestamp_to_compare = get_now_nanoseconds();
            if (timestamp == 0x000000000000000){
                timestamp = timestamp_to_compare;
            }
            if (timestamp_to_compare - timestamp > 1000000ULL){
                return SLOT_TIMEOUT;
            }
            max_iterations++;
            _mm_pause();
            continue;
        } else {
            hash_in_slot = identity_hashed_map[index].persistent_data.hash;
        }
        timestamp = 0x000000000000000;

        if ( hash_in_slot == EMPTY_SLOT_HASH ) {
            return_status = SLOT_AVAILABLE;
        } else if ( hash_in_slot == DELETED_SLOT_HASH ) {
            return_status = SLOT_DELETED;
        } else if (hash_in_slot == hash){
            return_status = SLOT_EQUALS;
        } else {
            return_status = SLOT_USED;
        }

        uint64_t status_verify = get_status(&identity_hashed_map[index].status);
        uint64_t verify_transaction_id = atomic_load_explicit(&identity_hashed_map[index].current_transaction_id, memory_order_acquire);
        if (status != status_verify || current_transaction_id != verify_transaction_id){
            max_iterations++;
            _mm_pause();
            continue;
        } else {
            return return_status;
        }

    }
    return SLOT_TIMEOUT;
}