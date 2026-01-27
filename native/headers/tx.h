#ifndef TX_H
#define TX_H

#include "shared.h"
#include "lockable.h"
#include "heap.h"

// CONSTANTS
#define MAX_TX (1 << 16)
#define MAX_TX_MASK (MAX_TX - 1)

#define MAX_OPERATIONS_TX (1 << 8)

typedef enum{
    TX_STATUS_FREE              = 0,
    TX_STATUS_STARTED           = 1,
    TX_STATUS_WAITING           = 2,
    TX_STATUS_ABORTED           = 3,
    TX_STATUS_COMMITED          = 4,
    TX_STATUS_LOCAL_PERSISTED   = 5,
    TX_STATUS_RESTORE           = 7,
} TX_STATUS;

typedef struct
{
    uint64_t old_heap_cursor;
    uint64_t new_heap_cursor;
    atomic_element_t* target;
} TxOperation;

typedef struct
{
    uint64_t  tx_id;
    TX_STATUS status;

    uint32_t  operation_counter;
    TxOperation operations[MAX_OPERATIONS_TX];

    uint32_t  checksum;
} Tx;

typedef atomic_element_t TxMap;

extern _Atomic uint64_t tx_counter;
extern TxMap tx_map[MAX_TX];

uint64_t      create_tx();
Tx*           get_tx(uint64_t transaction_id);
FnResponse    add_operation_tx(uint64_t old_cursor, uint64_t new_cursor, atomic_element_t* target, uint64_t tx_id, uint64_t dep_tx_id);
FnResponse    commit_tx(uint64_t transaction_id);
void          reset_tx(Tx *transaction);
void          persist_tx(Tx *transaction);

#endif