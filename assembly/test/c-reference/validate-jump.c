/**
 * Validates jump() implementations against official C reference code.
 * See README.md for details on usage and reference sources.
 */

#include <stdint.h>
#include <stdio.h>

// ============================================================================
// Xoroshiro128+ Implementation
// Based on: https://prng.di.unimi.it/xoroshiro128plus.c
// Public Domain, 2016-2018 by David Blackman and Sebastiano Vigna
// ============================================================================

static uint64_t xoroshiro128_s[2];

static inline uint64_t rotl_128(const uint64_t x, int k) {
    return (x << k) | (x >> (64 - k));
}

uint64_t xoroshiro128_next(void) {
    const uint64_t s0 = xoroshiro128_s[0];
    uint64_t s1 = xoroshiro128_s[1];
    const uint64_t result = s0 + s1;
    s1 ^= s0;
    xoroshiro128_s[0] = rotl_128(s0, 24) ^ s1 ^ (s1 << 16);
    xoroshiro128_s[1] = rotl_128(s1, 37);
    return result;
}

void xoroshiro128_jump(void) {
    static const uint64_t JUMP[] = { 0xdf900294d8f554a5, 0x170865df4b3201fc };

    uint64_t s0 = 0;
    uint64_t s1 = 0;
    for(size_t i = 0; i < sizeof JUMP / sizeof *JUMP; i++)
        for(int b = 0; b < 64; b++) {
            if (JUMP[i] & UINT64_C(1) << b) {
                s0 ^= xoroshiro128_s[0];
                s1 ^= xoroshiro128_s[1];
            }
            xoroshiro128_next();
        }
    xoroshiro128_s[0] = s0;
    xoroshiro128_s[1] = s1;
}

// ============================================================================
// Xoshiro256+ Implementation
// Based on: https://prng.di.unimi.it/xoshiro256plus.c
// Public Domain, 2018 by David Blackman and Sebastiano Vigna
// ============================================================================

static uint64_t xoshiro256_s[4];

static inline uint64_t rotl_256(const uint64_t x, int k) {
    return (x << k) | (x >> (64 - k));
}

uint64_t xoshiro256_next(void) {
    const uint64_t result = xoshiro256_s[0] + xoshiro256_s[3];
    const uint64_t t = xoshiro256_s[1] << 17;
    xoshiro256_s[2] ^= xoshiro256_s[0];
    xoshiro256_s[3] ^= xoshiro256_s[1];
    xoshiro256_s[1] ^= xoshiro256_s[2];
    xoshiro256_s[0] ^= xoshiro256_s[3];
    xoshiro256_s[2] ^= t;
    xoshiro256_s[3] = rotl_256(xoshiro256_s[3], 45);
    return result;
}

void xoshiro256_jump(void) {
    static const uint64_t JUMP[] = { 0x180ec6d33cfd0aba, 0xd5a61266f0c9392c,
                                      0xa9582618e03fc9aa, 0x39abdc4529b1661c };

    uint64_t s0 = 0;
    uint64_t s1 = 0;
    uint64_t s2 = 0;
    uint64_t s3 = 0;
    for(size_t i = 0; i < sizeof JUMP / sizeof *JUMP; i++)
        for(int b = 0; b < 64; b++) {
            if (JUMP[i] & UINT64_C(1) << b) {
                s0 ^= xoshiro256_s[0];
                s1 ^= xoshiro256_s[1];
                s2 ^= xoshiro256_s[2];
                s3 ^= xoshiro256_s[3];
            }
            xoshiro256_next();
        }
    xoshiro256_s[0] = s0;
    xoshiro256_s[1] = s1;
    xoshiro256_s[2] = s2;
    xoshiro256_s[3] = s3;
}

// ============================================================================
// Conversion Functions (matching our WASM uint64_to_float53 logic)
// ============================================================================

// Converts uint64 to float in [0, 1) using 53-bit precision
// Matches: uint64_to_float53() in conversion.ts
double uint64_to_float53(uint64_t value) {
    // Right shift by 11 to get 53 bits, multiply by 2^-53
    return (value >> 11) * 0x1.0p-53;
}

// ============================================================================
// Test Program
// ============================================================================

int main() {
    printf("Jump Reference Value Validation\n");
    printf("================================\n\n");

    // Test Xoroshiro128+ with complex seeds (TEST_SEEDS.DOUBLE_0, DOUBLE_1)
    // Used for non-SIMD Xoroshiro128Plus and SIMD lane 0
    printf("Xoroshiro128+ (seeds: DOUBLE_0, DOUBLE_1)\n");
    xoroshiro128_s[0] = 0x9E3779B97F4A7C15ULL;  // TEST_SEEDS.DOUBLE_0
    xoroshiro128_s[1] = 0x6C078965D5B2A5D3ULL;  // TEST_SEEDS.DOUBLE_1
    xoroshiro128_jump();
    uint64_t xoroshiro_result = xoroshiro128_next();
    double xoroshiro_float = uint64_to_float53(xoroshiro_result);
    printf("  After jump() then next(): %llu\n", (unsigned long long)xoroshiro_result);
    printf("  Hex: 0x%016llx\n", (unsigned long long)xoroshiro_result);
    printf("  As float53: %.17g\n\n", xoroshiro_float);

    // Test Xoroshiro128+ SIMD Lane 1 with complex seeds (TEST_SEEDS.QUAD_2, QUAD_3)
    printf("Xoroshiro128+ SIMD Lane 1 (seeds: QUAD_2, QUAD_3)\n");
    xoroshiro128_s[0] = 0xBF58476D1CE4E5B9ULL;  // TEST_SEEDS.QUAD_2
    xoroshiro128_s[1] = 0x94D049BB133111EBULL;  // TEST_SEEDS.QUAD_3
    xoroshiro128_jump();
    uint64_t xoroshiro_simd_lane1_result = xoroshiro128_next();
    double xoroshiro_simd_lane1_float = uint64_to_float53(xoroshiro_simd_lane1_result);
    printf("  After jump() then next(): %llu\n", (unsigned long long)xoroshiro_simd_lane1_result);
    printf("  Hex: 0x%016llx\n", (unsigned long long)xoroshiro_simd_lane1_result);
    printf("  As float53: %.17g\n\n", xoroshiro_simd_lane1_float);

    // Test Xoshiro256+ with complex seeds (TEST_SEEDS.QUAD_0, QUAD_1, QUAD_2, QUAD_3)
    // Used for non-SIMD Xoshiro256Plus and SIMD lane 0
    printf("Xoshiro256+ (seeds: QUAD_0, QUAD_1, QUAD_2, QUAD_3)\n");
    xoshiro256_s[0] = 0x9E3779B97F4A7C15ULL;  // TEST_SEEDS.QUAD_0
    xoshiro256_s[1] = 0x6C078965D5B2A5D3ULL;  // TEST_SEEDS.QUAD_1
    xoshiro256_s[2] = 0xBF58476D1CE4E5B9ULL;  // TEST_SEEDS.QUAD_2
    xoshiro256_s[3] = 0x94D049BB133111EBULL;  // TEST_SEEDS.QUAD_3
    xoshiro256_jump();
    uint64_t xoshiro_result = xoshiro256_next();
    double xoshiro_float = uint64_to_float53(xoshiro_result);
    printf("  After jump() then next(): %llu\n", (unsigned long long)xoshiro_result);
    printf("  Hex: 0x%016llx\n", (unsigned long long)xoshiro_result);
    printf("  As float53: %.17g\n\n", xoshiro_float);

    // Test Xoshiro256+ SIMD Lane 1 with complex seeds (TEST_SEEDS.OCTET_4, OCTET_5, OCTET_6, OCTET_7)
    printf("Xoshiro256+ SIMD Lane 1 (seeds: OCTET_4, OCTET_5, OCTET_6, OCTET_7)\n");
    xoshiro256_s[0] = 0x8C6D2D3A5F9A4B1CULL;  // TEST_SEEDS.OCTET_4
    xoshiro256_s[1] = 0xD3C5E8B2F7A16E4AULL;  // TEST_SEEDS.OCTET_5
    xoshiro256_s[2] = 0xA7B9C1D3E5F70829ULL;  // TEST_SEEDS.OCTET_6
    xoshiro256_s[3] = 0xF1E2D3C4B5A69788ULL;  // TEST_SEEDS.OCTET_7
    xoshiro256_jump();
    uint64_t xoshiro_simd_lane1_result = xoshiro256_next();
    double xoshiro_simd_lane1_float = uint64_to_float53(xoshiro_simd_lane1_result);
    printf("  After jump() then next(): %llu\n", (unsigned long long)xoshiro_simd_lane1_result);
    printf("  Hex: 0x%016llx\n", (unsigned long long)xoshiro_simd_lane1_result);
    printf("  As float53: %.17g\n\n", xoshiro_simd_lane1_float);

    // Summary for test-utils.ts JUMP_REFERENCE namespace
    printf("For test-utils.ts JUMP_REFERENCE namespace:\n");
    printf("============================================\n");
    printf("Xoroshiro128Plus:\n");
    printf("  uint64: %llu\n", (unsigned long long)xoroshiro_result);
    printf("  float:  %.17g\n\n", xoroshiro_float);
    printf("Xoroshiro128Plus_SIMD_Lane1:\n");
    printf("  uint64: %llu\n", (unsigned long long)xoroshiro_simd_lane1_result);
    printf("  float:  %.17g\n\n", xoroshiro_simd_lane1_float);
    printf("Xoshiro256Plus:\n");
    printf("  uint64: %llu\n", (unsigned long long)xoshiro_result);
    printf("  float:  %.17g\n\n", xoshiro_float);
    printf("Xoshiro256Plus_SIMD_Lane1:\n");
    printf("  uint64: %llu\n", (unsigned long long)xoshiro_simd_lane1_result);
    printf("  float:  %.17g\n", xoshiro_simd_lane1_float);

    return 0;
}
