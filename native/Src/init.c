
#include "../Headers/identity_map_headers.h"

__attribute__((constructor))
void init(){
    register_handler_transaction(IDENTITY_MAP_PROVIDER, (ActionHandler)transaction_provider_identity_map);
}