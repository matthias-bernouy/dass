#include "idmap.h"

FnResponse slot_state_idmap(const IdentityMapElement* element, const uint64_t hash)
{
    uint64_t read_hash = element->hash;
    if ( read_hash == hash ) {
        return RES_IDENTITY_MAP_SLOT_EQUALS;
    }
    else if ( read_hash == RES_IDENTIFIER_EMPTY ) {
        return RES_IDENTITY_MAP_SLOT_AVAILABLE;
    }
    else if ( read_hash == RES_IDENTIFIER_DELETED ) {
        return RES_IDENTITY_MAP_SLOT_DELETED;
    }
    else if ( read_hash != hash ) {
        return RES_IDENTITY_MAP_SLOT_USED;
    }
    return RES_IDENTITY_MAP_SLOT_TIMEOUT;
}