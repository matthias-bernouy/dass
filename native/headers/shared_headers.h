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
#include <immintrin.h>

typedef enum {
    SUCCESS           = 200,
    EXISTS            = 201,

    ALREADY_EXISTS    = 400,
    NOT_FOUND         = 404,

    ERR_FULL          = 503,
    ERR_CORRUPTED     = 504,
    ERR_TIMEOUT       = 505,
    ERR_MAX_ITERATION = 506,
    ERR_UNKNOWN       = 520
} ReturnCodes;

bool force_status(_Atomic uint64_t * data, uint64_t status);
bool is_status(_Atomic uint64_t *data, uint64_t status);
uint64_t get_status(_Atomic uint64_t *data);
bool try_change_status(_Atomic uint64_t* data, uint64_t expected, uint64_t desired);

uint64_t get_now_nanoseconds();

uint32_t xxh32_fixed(const void* input, size_t len, uint32_t seed);

#endif