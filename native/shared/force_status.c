#include "../headers/shared_headers.h"

bool force_status(_Atomic uint64_t *data, uint64_t status)
{
    atomic_store_explicit(data, status, memory_order_release);
    return true;
}