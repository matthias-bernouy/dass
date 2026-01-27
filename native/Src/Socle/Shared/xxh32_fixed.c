#include "Headers/shared_headers.h"

// Constants XXHash32
static const uint32_t PRIME32_1 = 2654435761U;
static const uint32_t PRIME32_2 = 2246822519U;
static const uint32_t PRIME32_3 = 3266489917U;
static const uint32_t PRIME32_4 =  668265263U;
static const uint32_t PRIME32_5 =  374761393U;

static inline uint32_t rotl32(uint32_t x, int r) {
    return (x << r) | (x >> (32 - r));
}

uint32_t xxh32_fixed(const void* input, size_t len, uint32_t seed) {
    const uint8_t* p = (const uint8_t*)input;
    const uint8_t* const bEnd = p + len;
    uint32_t h32;

    if (len >= 16) {
        const uint8_t* const limit = bEnd - 16;
        uint32_t v1 = seed + PRIME32_1 + PRIME32_2;
        uint32_t v2 = seed + PRIME32_2;
        uint32_t v3 = seed + 0;
        uint32_t v4 = seed - PRIME32_1;

        do {
            v1 += (*(const uint32_t*)p) * PRIME32_2; v1 = rotl32(v1, 13); v1 *= PRIME32_1; p += 4;
            v2 += (*(const uint32_t*)p) * PRIME32_2; v2 = rotl32(v2, 13); v2 *= PRIME32_1; p += 4;
            v3 += (*(const uint32_t*)p) * PRIME32_2; v3 = rotl32(v3, 13); v3 *= PRIME32_1; p += 4;
            v4 += (*(const uint32_t*)p) * PRIME32_2; v4 = rotl32(v4, 13); v4 *= PRIME32_1; p += 4;
        } while (p <= limit);

        h32 = rotl32(v1, 1) + rotl32(v2, 7) + rotl32(v3, 12) + rotl32(v4, 18);
    } else {
        h32 = seed + PRIME32_5;
    }

    h32 += (uint32_t)len;

    while (p + 4 <= bEnd) {
        h32 += (*(const uint32_t*)p) * PRIME32_3;
        h32 = rotl32(h32, 17) * PRIME32_4;
        p += 4;
    }
    while (p < bEnd) {
        h32 += (*p) * PRIME32_5;
        h32 = rotl32(h32, 11) * PRIME32_1;
        p++;
    }

    h32 ^= h32 >> 15;
    h32 *= PRIME32_2;
    h32 ^= h32 >> 13;
    h32 *= PRIME32_3;
    h32 ^= h32 >> 16;

    return h32;
}