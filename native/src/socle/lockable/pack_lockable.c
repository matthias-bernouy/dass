#include "lockable.h"

uint64_t pack_lockable(uint64_t cursor, uint8_t status)
{
    uint64_t s = (uint64_t)status; 
    return (cursor & CURSOR_MASK) | (s << STATUS_SHIFT);
}