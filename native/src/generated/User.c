#include "shared.h"
#include "document.h"

#define USER_SCHEMA_ID 1
#define DEFAULT_ZONE_ID 0

typedef struct User {
    DocumentComposedID _id; // generated

    uint32_t email_length; // required
    uint32_t fullname_length; // optional
    uint64_t balance; // generated 0

    uint8_t  raw[]; // calculated
} User;

User* create_user(uint8_t* email, uint32_t email_length, uint8_t* fullname, uint32_t fullname_length, uint64_t tx_id) {

    // Checks
    // If there is unique constraints
    // ...

    // Allocation
    const uint64_t raw_size = email_length + fullname_length;
    const uint64_t total_size = sizeof(User) + raw_size;
    User*    user = calloc_heap(total_size);
    assert(user != NULL);

    // Initialization
    user->_id = thread_generate_id_document(DEFAULT_ZONE_ID, USER_SCHEMA_ID);
    user->email_length = email_length;
    user->fullname_length = fullname_length;
    user->balance = 0;

    // Raw data
    memcpy(&user->raw[0], email, email_length);
    memcpy(&user->raw[email_length], fullname, fullname_length);

    // Store document
    FnResponse res = thread_create_document(user->_id, (void*)user, total_size, tx_id);
    assert(res == RES_STANDARD_TRUE);

    return user;
}