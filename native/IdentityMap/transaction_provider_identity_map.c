#include "../headers/identity_map_headers.h"

FnResponse transaction_provider_identity_map(PayloadTransaction* payload, TX_STATUS tx_status){
    HashIdentityData* data = (HashIdentityData*) payload->data;
    HashIdentityTransactionController* controller = (HashIdentityTransactionController*) payload->target;

    uint64_t h = data->hash;
    uint64_t value = data->value;

    if (tx_status == TX_STATUS_COMMITED){
        controller->persistent_data.hash = h;
        controller->persistent_data.value = value;
        return RES_STANDARD_SUCCESS;
    }

    if (tx_status == TX_STATUS_ABORTED){
        force_status(&controller->status, TX_ELEMENT_LOCKED);
        controller->staged_data.hash = RES_IDENTIFIER_EMPTY;
        controller->staged_data.value = RES_IDENTIFIER_EMPTY;
        force_status(&controller->status, TX_ELEMENT_NO_CONCURRENCY);
        return RES_STANDARD_SUCCESS;
    }

    return RES_SYS_ERR_UNKNOWN;
}