#include "shared.h"

// Constantes XXH64
static const uint64_t PRIME64_1 = 11400714785074694791ULL;
static const uint64_t PRIME64_2 = 14029467366897019727ULL;
static const uint64_t PRIME64_3 =  1609587929392839161ULL;
static const uint64_t PRIME64_4 =  9650029242287828579ULL;
static const uint64_t PRIME64_5 =  2870177450012600261ULL;

static inline uint64_t rotl64(uint64_t x, int r) {
    return (x << r) | (x >> (64 - r));
}

static inline uint64_t xxh64_round(uint64_t acc, uint64_t input) {
    acc += input * PRIME64_2;
    acc = rotl64(acc, 31);
    acc *= PRIME64_1;
    return acc;
}

static inline uint64_t xxh64_merge_round(uint64_t acc, uint64_t val) {
    val = xxh64_round(0, val);
    acc ^= val;
    acc = acc * PRIME64_1 + PRIME64_4;
    return acc;
}

uint64_t xxh64_fixed(const void* input, size_t len, uint64_t seed) {
    const uint8_t* p = (const uint8_t*)input;
    const uint8_t* const bEnd = p + len;
    uint64_t h64;

    if (len >= 32) {
        const uint8_t* const limit = bEnd - 32;
        uint32_t v1 = seed + PRIME64_1 + PRIME64_2;
        uint32_t v2 = seed + PRIME64_2;
        uint32_t v3 = seed + 0;
        uint32_t v4 = seed - PRIME64_1;

        do {
            v1 = xxh64_round(v1, *(const uint64_t*)p); p += 8;
            v2 = xxh64_round(v2, *(const uint64_t*)p); p += 8;
            v3 = xxh64_round(v3, *(const uint64_t*)p); p += 8;
            v4 = xxh64_round(v4, *(const uint64_t*)p); p += 8;
        } while (p <= limit);

        h64 = rotl64(v1, 1) + rotl64(v2, 7) + rotl64(v3, 12) + rotl64(v4, 18);
        h64 = xxh64_merge_round(h64, v1);
        h64 = xxh64_merge_round(h64, v2);
        h64 = xxh64_merge_round(h64, v3);
        h64 = xxh64_merge_round(h64, v4);
    } else {
        h64 = seed + PRIME64_5;
    }

    h64 += (uint64_t)len;

    // Traitement par blocs de 8 octets
    while (p + 8 <= bEnd) {
        uint64_t k1 = xxh64_round(0, *(const uint64_t*)p);
        h64 ^= k1;
        h64 = rotl64(h64, 27) * PRIME64_1 + PRIME64_4;
        p += 8;
    }
    // Traitement par blocs de 4 octets
    if (p + 4 <= bEnd) {
        h64 ^= (uint64_t)(*(const uint32_t*)p) * PRIME64_1;
        h64 = rotl64(h64, 23) * PRIME64_2 + PRIME64_3;
        p += 4;
    }
    // Traitement des octets restants
    while (p < bEnd) {
        h64 ^= (*p) * PRIME64_5;
        h64 = rotl64(h64, 11) * PRIME64_1;
        p++;
    }

    // Finalisation (Avalanche)
    h64 ^= h64 >> 33;
    h64 *= PRIME64_2;
    h64 ^= h64 >> 29;
    h64 *= PRIME64_3;
    h64 ^= h64 >> 32;

    return h64;
}