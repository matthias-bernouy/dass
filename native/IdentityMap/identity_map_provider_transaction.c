#include "../headers/identity_map_headers.h"

TX_RESPONSE identity_map_provider_transaction(PayloadTransaction* payload, TX_STATUS tx_status){
    HashIdentityData* data = (HashIdentityData*) payload->data;
    HashIdentityTransactionController* controller = (HashIdentityTransactionController*) payload->target;

    uint64_t h = data->hash;
    uint64_t value = data->value;

    if (tx_status == TX_STATUS_COMMITED){
        controller->persistent_data.hash = h;
        controller->persistent_data.value = value;
        return TX_RESPONSE_OK;
    }

    if (tx_status == TX_STATUS_ABORTED){
        force_status(&controller->status, TX_ELEMENT_LOCKED);
        controller->staged_data.hash = EMPTY_SLOT_HASH;
        controller->staged_data.value = EMPTY_SLOT_HASH;
        force_status(&controller->status, TX_ELEMENT_NO_CONCURRENCY);
        return TX_RESPONSE_OK;
    }

    return TX_RESPONSE_ERR_UNKNOWN;
}