#include "../headers/thread_headers.h"

_Thread_local uint64_t tx_id_cursor = 0;
_Thread_local uint64_t tx_id_limit = 0;