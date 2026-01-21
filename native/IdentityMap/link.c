#include "../headers/identity_map_headers.h"

FnResponse link(const uint8_t *key, size_t length, uint64_t value, uint64_t id_transaction)
{
    uint64_t h = xxh32_fixed(key, length, 0);
    uint32_t index = (uint32_t)(h & HASHMAP_MASK);
    uint32_t max_iterations = 1024;

    while (max_iterations--)
    {
        uint64_t slot_state = get_slot_state_with_comparing_hash(index, h);
        if (slot_state == RES_IDENTITY_MAP_SLOT_EQUALS) return RES_IDENTIFIER_EXISTS;
        if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) return RES_SYS_ERR_TIMEOUT;
        if (slot_state == RES_IDENTITY_MAP_SLOT_USED) {
            index = (index + 1) & HASHMAP_MASK;
            continue;
        }

        if (slot_state == RES_IDENTITY_MAP_SLOT_AVAILABLE || slot_state == RES_IDENTITY_MAP_SLOT_DELETED) {
            FnResponse statusExchanged;
            TX_ELEMENT_STATUS current_status = atomic_load_explicit(&identity_hashed_map[index].status, memory_order_acquire);
            if ( current_status == TX_ELEMENT_NO_CONCURRENCY ) {
                statusExchanged = try_change_status(&identity_hashed_map[index].status, TX_ELEMENT_NO_CONCURRENCY, TX_ELEMENT_LOCKED);
            } else {
                statusExchanged = try_change_status(&identity_hashed_map[index].status, TX_ELEMENT_STAGED, TX_ELEMENT_LOCKED);
            }

            if (statusExchanged != RES_STANDARD_TRUE)
            {
                _mm_pause();
                max_iterations++;
                continue;
            }

            HashIdentityData buffer;
            buffer.hash = h;
            buffer.value = value;

            PayloadTransaction payload;
            payload.target = &identity_hashed_map[index];
            payload.data   = &buffer;
            payload.size   = sizeof(HashIdentityData);
            payload.type   = IDENTITY_MAP_PROVIDER;
            
            FnResponse add_action_response = add_action_to_transaction(id_transaction, IDENTITY_MAP_PROVIDER, &payload);
            if ( add_action_response != RES_STANDARD_SUCCESS ){
                force_status(&identity_hashed_map[index].status, current_status);
                return RES_SYS_ERR_TIMEOUT;
            }

            FnResponse add_dependency_response = add_dependency_to_transaction(id_transaction, identity_hashed_map[index].current_transaction_id);
            if ( add_dependency_response != RES_STANDARD_SUCCESS ){
                force_status(&identity_hashed_map[index].status, current_status);
                return RES_SYS_ERR_TIMEOUT;
            }

            identity_hashed_map[index].current_transaction_id = id_transaction;
            identity_hashed_map[index].staged_data.hash = h;
            identity_hashed_map[index].staged_data.value = value;

            force_status(&identity_hashed_map[index].status, TX_ELEMENT_STAGED);

            return RES_STANDARD_SUCCESS;
        }
        return RES_STANDARD_FAILED;

    }
    return RES_SYS_ERR_MAX_ITERATION;
}