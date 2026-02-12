#include "lockable.h"

uint64_t pack_lockable(void* data_ptr, uint8_t status)
{
    uint64_t s = (uint64_t)status; 
    return ((uint64_t)data_ptr & POINTER_MASK) | (s & STATUS_BIT_MASK);
}