#include "Headers/shared_headers.h"

void force_status(_Atomic uint64_t *data, uint64_t status)
{
    atomic_store_explicit(data, status, memory_order_release);
}