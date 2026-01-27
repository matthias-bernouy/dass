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
 
#if defined(__x86_64__) || defined(_M_X64) || defined(__i386__)
    #include <immintrin.h>
#elif defined(__aarch64__)
    #include <arm_neon.h>
      static inline void _mm_pause() {
      __asm__ __volatile__("yield" ::: "memory");
  }
#endif
#include "./function_responses.h"

void       force_status(_Atomic uint64_t * data, uint64_t status);
FnResponse is_status(_Atomic uint64_t *data, uint64_t status);
uint64_t   get_status(_Atomic uint64_t *data);
FnResponse try_change_status(_Atomic uint64_t* data, uint64_t expected, uint64_t desired);

uint64_t get_now_nanoseconds();

uint32_t xxh32_fixed(const void* input, size_t len, uint32_t seed);

#endif