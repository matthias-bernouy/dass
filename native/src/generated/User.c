#include "shared.h"
#include "document.h"

static const uint16_t SCHEMA_ID   = 1;
static const uint16_t DEF_ZONE_ID = 0;

typedef struct {
        uint64_t last_tx_id;
        DocumentComposedID _id;
        uint32_t name_length;
        uint64_t age;
        uint32_t email_length;
        uint8_t  raw[];
} User;

User* create_user(uint32_t name_length, char* name, uint64_t age, uint32_t email_length, char* email,  uint64_t tx_id) {

        uint64_t cpt_raw = 0;
        const uint64_t create_raw_size = name_length + email_length;
        const uint64_t total_size = sizeof(User) + create_raw_size;
        User* element = calloc_heap(total_size);

        element->name_length = name_length;
        element->age = age;
        element->email_length = email_length;


        memcpy(&element->raw[cpt_raw], name, name_length);
        cpt_raw += name_length;
        

        memcpy(&element->raw[cpt_raw], email, email_length);
        cpt_raw += email_length;
        

        FnResponse res = thread_create_document(element->_id, (void*)element, total_size, tx_id);

        return element;
}

void* get_user(DocumentComposedID* _id) {
    return get_document(_id, SCHEMA_ID);
}

FnResponse del_user(DocumentComposedID* _id, uint64_t tx_id){
        User* element = get_document(_id, SCHEMA_ID);
        if (element == NULL) return false;
        return delete_document(_id, tx_id, element->last_tx_id);
}

FnResponse update_user(uint32_t name_length, char* name, uint64_t age, uint32_t email_length, char* email,  DocumentComposedID* _id, uint64_t tx_id) {

        User* initial_element = get_document(_id, SCHEMA_ID);
        if (initial_element == NULL) return false;

    uint64_t cpt_raw = 0;
    const uint64_t update_raw_size = name_length + email_length;
    const uint64_t total_size = sizeof(User) + update_raw_size;
    User* element = calloc_heap(total_size);

        element->name_length = name_length;
        element->age = age;
        element->email_length = email_length;


        memcpy(&element->raw[cpt_raw], name, name_length);
        cpt_raw += name_length;
        

        memcpy(&element->raw[cpt_raw], email, email_length);
        cpt_raw += email_length;
        

        return update_document(_id, element, total_size, tx_id, initial_element->last_tx_id);
}