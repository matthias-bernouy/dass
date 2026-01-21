#include "../headers/shared_headers.h"

FnResponse is_status(_Atomic uint64_t *data, uint64_t status)
{
    return atomic_load_explicit(data, memory_order_acquire) == status;
}