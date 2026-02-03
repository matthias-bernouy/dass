#include "shared.h"

_Thread_local uint64_t thread_rng_seed;

uint64_t random64(){
    uint64_t z = (thread_rng_seed += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}