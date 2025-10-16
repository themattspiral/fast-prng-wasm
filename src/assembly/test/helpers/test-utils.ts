/**
 * AssemblyScript Test Utilities
 *
 * Shared constants and test seeds for AS PRNG unit tests.
 */

// ============================================================================
// Test Seeds (Complex 64-bit values)
// ============================================================================

/**
 * Primary test seeds for deterministic testing (complex 64-bit values).
 * Using large, non-trivial values to exercise all bit patterns.
 */
export namespace TEST_SEEDS {
  // Single seed (for PCG)
  export const SINGLE: u64 = 0x9E3779B97F4A7C15;

  // Double seeds (for Xoroshiro128Plus)
  export const DOUBLE_0: u64 = 0x9E3779B97F4A7C15;
  export const DOUBLE_1: u64 = 0x6C078965D5B2A5D3;

  // Quad seeds (for Xoshiro256Plus and SIMD variants)
  export const QUAD_0: u64 = 0x9E3779B97F4A7C15;
  export const QUAD_1: u64 = 0x6C078965D5B2A5D3;
  export const QUAD_2: u64 = 0xBF58476D1CE4E5B9;
  export const QUAD_3: u64 = 0x94D049BB133111EB;

  // Octet seeds (for Xoshiro256Plus_SIMD - 2 parallel streams)
  export const OCTET_0: u64 = 0x9E3779B97F4A7C15;
  export const OCTET_1: u64 = 0x6C078965D5B2A5D3;
  export const OCTET_2: u64 = 0xBF58476D1CE4E5B9;
  export const OCTET_3: u64 = 0x94D049BB133111EB;
  export const OCTET_4: u64 = 0x8C6D2D3A5F9A4B1C;
  export const OCTET_5: u64 = 0xD3C5E8B2F7A16E4A;
  export const OCTET_6: u64 = 0xA7B9C1D3E5F70829;
  export const OCTET_7: u64 = 0xF1E2D3C4B5A69788;
}

/**
 * Alternate test seeds for "different seeds" tests.
 * These values are intentionally different from primary seeds.
 */
export namespace TEST_SEEDS_ALT {
  // Single seed (for PCG)
  export const SINGLE: u64 = 0xD2B74407B1CE4E93;

  // Double seeds (for Xoroshiro128Plus)
  export const DOUBLE_0: u64 = 0xD2B74407B1CE4E93;
  export const DOUBLE_1: u64 = 0x82F63B78EB765817;

  // Quad seeds (for Xoshiro256Plus and SIMD variants)
  export const QUAD_0: u64 = 0xD2B74407B1CE4E93;
  export const QUAD_1: u64 = 0x82F63B78EB765817;
  export const QUAD_2: u64 = 0xC5A2E9BD4F8A7320;
  export const QUAD_3: u64 = 0x9F4D3E7C2A1B6854;

  // Octet seeds (for Xoshiro256Plus_SIMD)
  export const OCTET_0: u64 = 0xD2B74407B1CE4E93;
  export const OCTET_1: u64 = 0x82F63B78EB765817;
  export const OCTET_2: u64 = 0xC5A2E9BD4F8A7320;
  export const OCTET_3: u64 = 0x9F4D3E7C2A1B6854;
  export const OCTET_4: u64 = 0xE8B3C4D5A6F71928;
  export const OCTET_5: u64 = 0xB7A98C6D5E4F3210;
  export const OCTET_6: u64 = 0xF4E3D2C1B0A98877;
  export const OCTET_7: u64 = 0xA1B2C3D4E5F60789;
}

// ============================================================================
// Test Sample Sizes
// ============================================================================

/**
 * Sample size for deterministic tests (uniqueness, sequence matching, range validation).
 * 10K samples provide negligible collision probability (~10^-12) from 2^64 space.
 */
export const DETERMINISTIC_SAMPLE_SIZE: i32 = 10000;

/**
 * Sample size for distribution and Monte Carlo smoke tests.
 * 100K samples provide ~±4% quartile tolerance and ~±0.02 π estimation tolerance.
 */
export const DISTRIBUTION_SAMPLE_SIZE: i32 = 100000;

// ============================================================================
// Test Thresholds
// ============================================================================

/**
 * Note on 100% threshold expectations in deterministic tests:
 *
 * Throughout the test suite, we use 100% thresholds (exact equality) for all deterministic
 * comparisons including:
 * - Different seeds producing different sequences
 * - Stream selection (jump-based or increment-based) producing non-overlapping sequences
 * - Same seeds producing identical sequences
 * - SIMD lane independence when seeded differently
 *
 * Rationale: With proper PRNGs and typical test sample sizes from 2^64 space, expected
 * positional matches between different seeds is ~10^-16 to 10^-6 (essentially zero).
 * Any match indicates a serious implementation bug, not a statistical edge case.
 */

/**
 * Quartile bounds for distribution tests (100K samples).
 * Expected: 25K per quartile, allow ±4% (24K-26K).
 */
export const QUARTILE_MIN: i32 = 24000;
export const QUARTILE_MAX: i32 = 26000;

/**
 * Tolerance for Monte Carlo π estimation (100K samples).
 * With 100K samples, standard error is ~0.005, so ±0.02 gives >99% confidence.
 */
export const PI_ESTIMATE_TOLERANCE: f64 = 0.02;

/**
 * Mathematical constant π for comparison in Monte Carlo tests.
 */
export const PI: f64 = 3.14159265358979;

// ============================================================================
// Bit Masks and Constants
// ============================================================================

/**
 * 2^63 - used for testing high bit in uint64 values.
 */
export const BIT_63: u64 = 0x8000000000000000;

/**
 * 2^31 - used for testing high bit in uint32 values.
 */
export const BIT_31: u32 = 0x80000000;

/**
 * Quartile boundaries for uint64 distribution tests.
 */
export const U64_Q1_MAX: u64 = 0x3FFFFFFFFFFFFFFF;
export const U64_Q2_MAX: u64 = 0x7FFFFFFFFFFFFFFF;
export const U64_Q3_MAX: u64 = 0xBFFFFFFFFFFFFFFF;

/**
 * Quartile boundaries for uint32 distribution tests.
 */
export const U32_Q1_MAX: u32 = 0x3FFFFFFF;
export const U32_Q2_MAX: u32 = 0x7FFFFFFF;
export const U32_Q3_MAX: u32 = 0xBFFFFFFF;

/**
 * Maximum safe integer (2^53-1) for uint53 range validation.
 */
export const MAX_SAFE_INTEGER: f64 = 9007199254740991;

/**
 * Maximum uint32 value (2^32-1) for uint32 range validation.
 */
export const MAX_UINT32: f64 = 4294967295;

// ============================================================================
// Jump Function Reference Values
// ============================================================================

/**
 * Reference jump values from official C implementations.
 * Used to validate jump() correctness against authoritative sources.
 *
 * Validation methodology:
 * - Initialize with TEST_SEEDS (complex 64-bit values)
 * - Call jump() once
 * - Call next() once
 * - Compare result to C reference implementation
 *
 * These values are generated and verified by src/assembly/test/c-reference/validate-jump.c
 * which implements the official reference code from https://prng.di.unimi.it/
 *
 * To regenerate/verify these values:
 *   npm run test:c-ref
 *
 * When updating these values, also update the corresponding JS values in
 * test/helpers/test-utils.ts (JUMP_REFERENCE constant).
 */
export namespace JUMP_REFERENCE {
  /**
   * Xoroshiro128+ reference from https://prng.di.unimi.it/xoroshiro128plus.c
   * Test seeds: TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1
   * Result after jump() then next(): 17359279474558191039
   *
   * Verified by: src/assembly/test/c-reference/validate-jump.c
   */
  export const XOROSHIRO128PLUS: u64 = 17359279474558191039;

  /**
   * Xoshiro256+ reference from https://prng.di.unimi.it/xoshiro256plus.c
   * Test seeds: TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3
   * Result after jump() then next(): 1569848409778915303
   *
   * Verified by: src/assembly/test/c-reference/validate-jump.c
   */
  export const XOSHIRO256PLUS: u64 = 1569848409778915303;
}
