#ifndef XXSHARED_H
#define XXSHARED_H

#define _GNU_SOURCE

#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <string.h>
#include <sys/time.h>
#include <time.h>
#include <stdio.h>

#include "responses.h"

#ifdef DEV_MODE
    #include <assert.h>
    #include <stdio.h>
#else
    #ifndef NDEBUG
        #define NDEBUG
    #endif
    #include <assert.h>
#endif

 
#if defined(__x86_64__) || defined(_M_X64) || defined(__i386__)
    #include <immintrin.h>
#elif defined(__aarch64__)
    #include <arm_neon.h>
      static inline void _mm_pause() {
      __asm__ __volatile__("yield" ::: "memory");
  }
#endif

#define IDENTIFIER_START_INDEX 1024
#define IDENTIFIER_EMPTY 0x0000000000000000ULL


uint64_t get_now_nanoseconds();
uint32_t xxh32_fixed(const void* input, size_t len, uint32_t seed);
uint64_t xxh64_fixed(const void* input, size_t len, uint64_t seed)

#endif