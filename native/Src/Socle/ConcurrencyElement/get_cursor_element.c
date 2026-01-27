#include "Headers/concurrency_element_headers.h"

uint64_t get_cursor_element(atomic_element_t val)
{
    return val & CURSOR_MASK;
}