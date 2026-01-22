#ifndef TRANSACTION_SYSTEM_H
#define TRANSACTION_SYSTEM_H

#include "./shared_headers.h"

// CONSTANTS
#define MAX_TRANSACTIONS (1 << 16)
#define TRANSACTION_MODULO_MASK (MAX_TRANSACTIONS - 1)
#define TRANSACTION_TIMEOUT_NS (5ULL * 60ULL * 1000000000ULL)

#define TRANSACTION_MAX_ACTIONS (1 << 7)

#define TRANSACTION_MAX_HANDLER (1 << 8)
#define TRANSACTION_MAX_DEPENDENCIES (1 << 8)

typedef enum {
    TX_ELEMENT_NO_CONCURRENCY = 0,
    TX_ELEMENT_LOCKED         = 1,
    TX_ELEMENT_STAGED         = 2,
} TX_ELEMENT_STATUS;

typedef enum{
    TX_STATUS_FREE              = 0,
    TX_STATUS_STARTED           = 1,
    TX_STATUS_WAITING           = 2,
    TX_STATUS_ABORTED           = 3,
    TX_STATUS_COMMITED          = 4,
    TX_STATUS_LOCAL_PERSISTED   = 5,
    TX_STATUS_GLOBAL_PERSISTED  = 6,
} TX_STATUS;

typedef enum{
    IDENTITY_MAP_PROVIDER = 1
} PROVIDER_ACTION_TRANSACTION;

// STRUCTURES
typedef struct
{
    uint32_t type; 
    uint32_t size;
    void *target;
    void *data;
} PayloadTransaction;

typedef struct
{
    uint64_t transaction_id;
    _Atomic uint64_t status;
    uint64_t timestamp;

    _Atomic uint64_t action_counter;
    _Atomic uint64_t dependencies_of_counter;
    _Atomic uint64_t depends_on_counter;
    uint32_t checksum;               
    PayloadTransaction actions[TRANSACTION_MAX_ACTIONS];
    uint64_t dependencies_of[TRANSACTION_MAX_ACTIONS];
    uint64_t depends_on[TRANSACTION_MAX_ACTIONS];
} Transaction;

typedef FnResponse (*ActionHandler)(PayloadTransaction* payload, TX_STATUS tx_status);

typedef struct
{
    uint64_t transaction_id;
    uint32_t _padding;
    Transaction ptr;
} MapTransactionEntry;

typedef struct
{
    ActionHandler perform;
} MapHandlerEntry;

extern _Atomic uint64_t global_handler_counter;
extern _Atomic uint64_t global_transaction_counter;
extern MapTransactionEntry transaction_map[MAX_TRANSACTIONS];
extern MapHandlerEntry handler_map[TRANSACTION_MAX_HANDLER];


uint64_t create_transaction();
Transaction* get_transaction(uint64_t transaction_id);
FnResponse register_handler_transaction(uint32_t index, ActionHandler handler);
FnResponse add_action_transaction(uint64_t transaction_id, uint32_t action_provider, PayloadTransaction *payload);
FnResponse commit_transaction(uint64_t transaction_id);
FnResponse add_dependency_transaction(uint64_t my_id, uint64_t owner_id);

#endif