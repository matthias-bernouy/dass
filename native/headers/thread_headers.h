#ifndef XXTHREAD_H
#define XXTHREAD_H

#include "./shared_headers.h"

#define THREAD_TRANSACTION_BATCH_SIZE 512

extern _Thread_local uint64_t tx_id_cursor;
extern _Thread_local uint64_t tx_id_limit;

#endif