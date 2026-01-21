#include "../headers/identity_map_headers.h"

// ReturnCodes unlink(const uint8_t *key, size_t length, uint64_t id_transaction)
// {

//     uint64_t h = xxh32_fixed(key, length, 0);
//     uint32_t index = (uint32_t)(h & HASHMAP_MASK);
//     uint32_t max_iterations = 1024;

//     while (max_iterations--)
//     {
//         uint64_t slot_state = get_slot_state_with_comparing_hash(index, h);
//         if (slot_state == SLOT_AVAILABLE)
//             return NOT_FOUND;
//         if (slot_state == SLOT_TIMEOUT)
//             return ERR_TIMEOUT;
//         if (slot_state == SLOT_USED || slot_state == SLOT_DELETED)
//         {
//             index = (index + 1) & HASHMAP_MASK;
//             continue;
//         }
//         if (slot_state == SLOT_EQUALS)
//         {

//             bool statusExchanged = tryExchangeStatus(&identity_hashed_map[index].status, TX_FREE, TX_LOCKED);
//             if (!tryExchangeStatus(&identity_hashed_map[index].status, TX_FREE, TX_LOCKED)) {
//                 _mm_pause();
//                 max_iterations++;
//                 continue;
//             }

//             identity_hashed_map[index].staged_data.hash = 0XFFFFFFFFFFFFFFFF;
//             identity_hashed_map[index].staged_data.value = 0XFFFFFFFFFFFFFFFF;

//             force_status(&identity_hashed_map[index].status, TX_ELEMENT_STAGED);

//             add_action_to_transaction(id_transaction, PROVIDER_TRANSACTION_ID, sizeof(HashIdentityData), &identity_hashed_map[index].staged_data);

//             return SUCCESS;
//         }
//         return ERR_UNKNOWN;
//     }
//     return ERR_MAX_ITERATION;
// }