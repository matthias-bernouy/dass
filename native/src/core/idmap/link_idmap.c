#include "idmap.h"

FnResponse link_idmap(const uint8_t *key, size_t length, uint64_t value, uint64_t tx_id)
{
    uint64_t h = xxh32_fixed(key, length, 0);
    uint32_t index = (uint32_t)(h & ID_MAP_MASK);
    uint64_t tries = 0;

    while (tries++ < CONCURRENCY_MAX_TRIES)
    {
        uint64_t dep_tx_id = IDENTIFIER_EMPTY;

        lockable_element_t* element = &identity_map[index];
        const IdentityMapElement* element_start = (const IdentityMapElement*) get_lockable(element);

        if ( element_start != NULL ) {
            dep_tx_id = element_start->transaction_id;
            FnResponse slot_state = slot_state_idmap(element_start, h);
            if (slot_state == RES_IDENTITY_MAP_SLOT_EQUALS) return RES_IDENTIFIER_EXISTS;
            if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) return RES_SYS_ERR_TIMEOUT;
            if (slot_state == RES_IDENTITY_MAP_SLOT_USED) {
                index = (index + 1) & ID_MAP_MASK;
                continue;
            }
        }

        const IdentityMapElement* element_end = (const IdentityMapElement*) try_get_and_lock_lockable(element);

        if ( element_start != element_end ) {
            free_lockable(element);
            _mm_pause();
            continue;
        }

        IdentityMapElement new_data = {
            .hash = h,
            .value = value,
            .transaction_id = tx_id,
            .status = ID_MAP_ELEMENT_USED
        };

        FnResponse res = safe_total_update_lockable(element, &new_data, sizeof(IdentityMapElement), tx_id, dep_tx_id);
        assert(res);

        if ( !res ) {
            free_lockable(element);
            return res;
        }
    
        return true;
    }

    return RES_SYS_ERR_MAX_ITERATION;
}