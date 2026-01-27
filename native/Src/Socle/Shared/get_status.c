#include "Headers/shared_headers.h"

uint64_t get_status(_Atomic uint64_t *data)
{
    return atomic_load_explicit(data, memory_order_acquire);
}