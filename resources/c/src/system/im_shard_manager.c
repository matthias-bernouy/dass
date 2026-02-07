#include "system.h"


// This function is for decentralized shard responsability management
// For now, it always returns true because the decentralized management is not implemented
bool im_shard_manager(uint16_t zone_id, uint32_t shard_id) {
    if (zone_id >= 0 && shard_id >= 0) {
        return true;
    }
    return false;
}