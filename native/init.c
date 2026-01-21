
#include "headers/identity_map_headers.h"

__attribute__((constructor))
void init(){
    register_handler(IDENTITY_MAP_PROVIDER, (ActionHandler)identity_map_provider_transaction);
}