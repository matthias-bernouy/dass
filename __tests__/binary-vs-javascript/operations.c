#include <stdint.h>

// On empêche l'inlining pour être sûr que le benchmark est fidèle
#define NO_INLINE __attribute__((noinline))

NO_INLINE void bench_and(volatile uint32_t* data, int length) {
    for (int i = 0; i < 100000000; i++) data[0] &= 255;
}

NO_INLINE void bench_modulo(volatile uint32_t* data, int length) {
    for (int i = 0; i < 100000000; i++) data[0] %= 256;
}

// Décalage de 1 bit vers la droite (équivaut à / 2)
NO_INLINE void bench_shift(volatile uint32_t* data, int length) {
    for (int i = 0; i < 100000000; i++) data[0] >>= 1;
}

// Division classique par 2
NO_INLINE void bench_div(volatile uint32_t* data, int length) {
    for (int i = 0; i < 100000000; i++) data[0] /= 2;
}

// Addition simple
NO_INLINE void bench_add(volatile uint32_t* data, int length) {
    for (int i = 0; i < 100000000; i++) data[0] += 10;
}

// Multiplication simple
NO_INLINE void bench_mul(volatile uint32_t* data, int length) {
    for (int i = 0; i < 100000000; i++) data[0] *= 10;
}