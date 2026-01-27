#include "Headers/concurrency_element_headers.h"

CONCURRENCY_STATUS get_status_element(atomic_element_t val)
{
    return (CONCURRENCY_STATUS)(val >> STATUS_SHIFT);
}