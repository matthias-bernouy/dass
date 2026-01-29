#include "idmap.h"

FnResponse exists_idmap(const uint8_t *key, size_t length)
{
    uint64_t h = xxh64_fixed(key, length, 0);
    uint32_t index = (uint32_t)(h & ID_MAP_MASK);
    uint32_t tries = 0;

    while (tries++ < CONCURRENCY_MAX_TRIES)
    {
        lockable_element_t* element = &identity_map[index];
        const IdentityMapElement*  element_data   = (const IdentityMapElement*)get_lockable(element);

        printf("element_data %p\n", element_data);
        // affichage elment_data

        if ( element_data == NULL ) {
            return RES_IDENTIFIER_NOT_FOUND;
        }

        printf("element_data->status %llu\n", element_data->status);
        printf("element_data->hash %llu\n", element_data->hash);
        printf("element_data->value %llu\n", element_data->value);
        printf("element_data->tx_id %llu\n", element_data->transaction_id);

        FnResponse slot_state = slot_state_idmap(element_data, h);

        if (slot_state == RES_IDENTITY_MAP_SLOT_EQUALS) return RES_IDENTIFIER_EXISTS;
        if (slot_state == RES_IDENTITY_MAP_SLOT_AVAILABLE) return RES_IDENTIFIER_NOT_FOUND;
        if (slot_state == RES_IDENTITY_MAP_SLOT_DELETED || slot_state == RES_IDENTITY_MAP_SLOT_USED) {
            index = (index + 1) & ID_MAP_MASK;
            continue;
        }
        if (slot_state == RES_IDENTITY_MAP_SLOT_TIMEOUT) {
            return RES_SYS_ERR_TIMEOUT;
        }
    }
    assert(false);
    return RES_SYS_ERR_MAX_ITERATION;
}