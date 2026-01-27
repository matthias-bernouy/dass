#include "Headers/shared_headers.h"

FnResponse try_change_status(_Atomic uint64_t * data, uint64_t expected, uint64_t desired)
{
    return atomic_compare_exchange_strong_explicit(
        data,
        &expected,
        desired,
        memory_order_acq_rel,
        memory_order_relaxed) ? RES_STANDARD_TRUE : RES_STANDARD_FALSE;
}