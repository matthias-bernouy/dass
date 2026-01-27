#include "lockable.h"

uint64_t pack_lockable(uint64_t cursor, uint8_t status)
{
    return (cursor & CURSOR_MASK) | ((uint64_t)(status) << STATUS_SHIFT);
}