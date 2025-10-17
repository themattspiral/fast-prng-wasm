/**
 * JavaScript Test Utilities
 *
 * Shared constants, test seeds, and helper functions for JS integration tests.
 */

import { RandomGenerator, PRNGType, seed64Array } from 'fast-prng-wasm';

// ============================================================================
// Test Seeds (Complex 64-bit values)
// ============================================================================

/**
 * Test seeds for deterministic testing (known 64-bit values).
 * Using large, non-trivial values to exercise all bit patterns.
 */
export const TEST_SEEDS = {
    single: [0x9E3779B97F4A7C15n],
    double: [0x9E3779B97F4A7C15n, 0x6C078965D5B2A5D3n],
    quad: [0x9E3779B97F4A7C15n, 0x6C078965D5B2A5D3n, 0xBF58476D1CE4E5B9n, 0x94D049BB133111EBn],
    octet: [0x9E3779B97F4A7C15n, 0x6C078965D5B2A5D3n, 0xBF58476D1CE4E5B9n, 0x94D049BB133111EBn,
            0x8C6D2D3A5F9A4B1Cn, 0xD3C5E8B2F7A16E4An, 0xA7B9C1D3E5F70829n, 0xF1E2D3C4B5A69788n]
};

/**
 * Alternate test seeds for "different seeds" tests.
 * These values are intentionally different from primary seeds.
 * Matches AS TEST_SEEDS_ALT.
 */
export const TEST_SEEDS_ALT = {
    single: [0xD2B74407B1CE4E93n],
    double: [0xD2B74407B1CE4E93n, 0x82F63B78EB765817n],
    quad: [0xD2B74407B1CE4E93n, 0x82F63B78EB765817n, 0xC5A2E9BD4F8A7320n, 0x9F4D3E7C2A1B6854n],
    octet: [0xD2B74407B1CE4E93n, 0x82F63B78EB765817n, 0xC5A2E9BD4F8A7320n, 0x9F4D3E7C2A1B6854n,
            0xE8B3C4D5A6F71928n, 0xB7A98C6D5E4F3210n, 0xF4E3D2C1B0A98877n, 0xA1B2C3D4E5F60789n]
};

// ============================================================================
// PRNG Type Configurations
// ============================================================================

/**
 * Expected seed counts for each PRNG type.
 * Note: SIMD versions require double the seeds (2 parallel streams).
 */
export const SEED_COUNTS: Record<PRNGType, number> = {
    [PRNGType.PCG]: 1,
    [PRNGType.Xoroshiro128Plus]: 2,
    [PRNGType.Xoroshiro128Plus_SIMD]: 4,
    [PRNGType.Xoshiro256Plus]: 4,
    [PRNGType.Xoshiro256Plus_SIMD]: 8
};

/**
 * All PRNG types for multi-algorithm testing.
 */
export const ALL_PRNG_TYPES = [
    PRNGType.PCG,
    PRNGType.Xoroshiro128Plus,
    PRNGType.Xoroshiro128Plus_SIMD,
    PRNGType.Xoshiro256Plus,
    PRNGType.Xoshiro256Plus_SIMD
] as const;

/**
 * Non-SIMD PRNG types (single-lane generators).
 * SIMD generators interleave dual-lane output in array methods, so they have different
 * stream consistency behavior than non-SIMD generators.
 */
export const NON_SIMD_PRNG_TYPES = [
    PRNGType.PCG,
    PRNGType.Xoroshiro128Plus,
    PRNGType.Xoshiro256Plus
] as const;

// ============================================================================
// Integer Range and Mathematical Constants
// ============================================================================

/**
 * Maximum value for 32-bit unsigned integers.
 */
export const UINT32_MAX = 0xFFFFFFFF;

/**
 * Maximum value for 64-bit unsigned integers (bigint).
 */
export const UINT64_MAX = 0xFFFFFFFFFFFFFFFFn;

/**
 * 2^32 as a number (range of 32-bit unsigned integers).
 */
export const TWO_POW_32 = 0x100000000;

/**
 * 2^53 as a number (maximum safe integer + 1).
 * Used for int53 range calculations.
 */
export const TWO_POW_53 = 9007199254740992;

/**
 * 2^64 as a bigint (range of 64-bit unsigned integers).
 * Used for uint64 range calculations.
 */
export const TWO_POW_64 = 2n ** 64n;

/**
 * Number of parallel lanes in SIMD generators.
 * SIMD generators process two independent streams simultaneously.
 */
export const SIMD_LANE_COUNT = 2;

// ============================================================================
// Test Sample Sizes
// ============================================================================

/**
 * Sample size for integration smoke tests.
 *
 * Used in tests that verify wrapper integration (correct wiring, return types, basic behavior)
 * across all 5 PRNGs × 6 methods. These are NOT quality tests - they catch integration bugs
 * like "wrong WASM function called" or "PRNG stuck at zero".
 *
 * 1,000 samples provides:
 * - Negligible collision probability (~10^-11 for float53, ~10^-14 for uint64)
 * - Fast execution across 30+ test combinations (5 PRNGs × 6 methods)
 * - Clear separation from comprehensive quality tests (100K-1M samples in statistical-validation.test.ts)
 *
 * Intentionally smaller than AS tests (10K) to optimize speed while maintaining adequate
 * verification. Quality validation happens in statistical-validation.test.ts.
 */
export const INTEGRATION_SAMPLE_SIZE = 1000;

/**
 * Default output array size (matches RandomGenerator default constructor parameter).
 */
export const DEFAULT_OUTPUT_ARRAY_SIZE = 1000;

/**
 * Custom array sizes for testing various scenarios.
 */
export const CUSTOM_ARRAY_SIZE_SMALL = 500;
export const CUSTOM_ARRAY_SIZE_LARGE = 2000;

/**
 * Array size that exceeds WASM memory limits (1 page = 64KB).
 * With 2 arrays (BigUint64Array + Float64Array) at 8 bytes/element,
 * 5000 elements = ~80KB total, which exceeds the 64KB limit.
 */
export const MEMORY_EXCEEDING_ARRAY_SIZE = 5000;

/**
 * Number of parallel generators for multi-generator tests.
 */
export const PARALLEL_GENERATOR_COUNT = 3;

/**
 * Number of times to advance generator state in instance tests.
 */
export const INSTANCE_TEST_ADVANCE_COUNT = 10;

/**
 * Number of samples to compare in instance sequence tests.
 */
export const INSTANCE_TEST_SAMPLE_COUNT = 5;

// ============================================================================
// Jump Function Reference Values
// ============================================================================

/**
 * Reference values for jump() validation.
 * These are the expected first float values after calling jump() once with TEST_SEEDS,
 * then generating the next value (via float(), floatArray()[0], etc.).
 *
 * Generated and verified by: src/assembly/test/c-reference/validate-jump.c
 * To regenerate: npm run test:c-ref
 *
 * When updating these values, also update the corresponding AS values in
 * src/assembly/test/test-utils.ts (JUMP_REFERENCE namespace)
 */
export const JUMP_REFERENCE = {
    /** Xoroshiro128Plus with TEST_SEEDS.double, first value after jump() */
    XOROSHIRO128PLUS: 0.94104842595495075,

    /** Xoroshiro128Plus SIMD Lane 1 with TEST_SEEDS.quad[2,3], first value after jump() */
    XOROSHIRO128PLUS_SIMD_LANE1: 0.56262870976309654,

    /** Xoshiro256Plus with TEST_SEEDS.quad, first value after jump() */
    XOSHIRO256PLUS: 0.085101652817760609,

    /** Xoshiro256Plus SIMD Lane 1 with TEST_SEEDS.octet[4,5,6,7], first value after jump() */
    XOSHIRO256PLUS_SIMD_LANE1: 0.55326868388004757
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the appropriate test seeds for a given PRNG type.
 */
export function getSeedsForPRNG(prngType: PRNGType): bigint[] {
    const count = SEED_COUNTS[prngType];

    switch (count) {
        case 1: return TEST_SEEDS.single;
        case 2: return TEST_SEEDS.double;
        case 4: return TEST_SEEDS.quad;
        case 8: return TEST_SEEDS.octet;
        default: throw new Error(`Unknown seed count: ${count}`);
    }
}

/**
 * Creates a test generator with default settings for quick testing.
 */
export function createTestGenerator(
    prngType: PRNGType = PRNGType.Xoroshiro128Plus_SIMD,
    seeds: bigint[] | null = null
): RandomGenerator {
    return new RandomGenerator(prngType, seeds);
}

/**
 * Creates multiple generators with the same seeds but different stream IDs.
 * Useful for testing parallel generator scenarios.
 */
export function createParallelGenerators(
    count: number,
    prngType: PRNGType = PRNGType.Xoroshiro128Plus_SIMD,
    sharedSeeds: bigint[] | null = null
): RandomGenerator[] {
    const generators: RandomGenerator[] = [];

    for (let i = 0; i < count; i++) {
        generators.push(new RandomGenerator(prngType, sharedSeeds, BigInt(i + 1)));
    }

    return generators;
}

/**
 * Generates a sequence of random numbers from a generator.
 *
 * @param generator The RandomGenerator instance
 * @param count Number of values to generate
 * @param method The method to call (e.g., 'float', 'int64')
 * @returns Array of generated values
 */
export function generateSequence<T>(
    generator: RandomGenerator,
    count: number,
    method: keyof Pick<RandomGenerator, 'float' | 'int64' | 'int53' | 'int32' | 'coord' | 'coordSquared'>
): T[] {
    const sequence: T[] = [];

    for (let i = 0; i < count; i++) {
        sequence.push(generator[method]() as T);
    }

    return sequence;
}

/**
 * Checks if a value is within an expected range.
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value < max;
}

/**
 * Checks if all values in an array are within an expected range.
 */
export function allInRange(values: number[], min: number, max: number): boolean {
    return values.every(v => isInRange(v, min, max));
}

/**
 * Checks if two arrays of numbers are approximately equal within a tolerance.
 */
export function arraysApproximatelyEqual(a: number[], b: number[], tolerance: number = 1e-10): boolean {
    if (a.length !== b.length) return false;

    return a.every((val, i) => Math.abs(val - b[i]) < tolerance);
}

// ============================================================================
// Randomized Test Helpers
// ============================================================================

/**
 * Runs a single iteration of a randomized test with automatic seed logging on failure.
 *
 * When randomized tests fail in CI, the generated seeds are lost, making it impossible
 * to reproduce failures locally. This helper logs seeds on failure to enable debugging.
 *
 * @param algo The PRNG algorithm to test
 * @param iteration Current iteration number (for logging)
 * @param testFn Test function that receives the generator and seeds
 *
 * @example
 * for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
 *     runRandomizedIteration(algo, iteration, (gen, seeds) => {
 *         const seq1 = generateSequence(gen, 100, 'float');
 *         expect(seq1).toHaveLength(100);
 *     });
 * }
 */
export function runRandomizedIteration(
    algo: PRNGType,
    iteration: number,
    testFn: (gen: RandomGenerator, seeds: bigint[]) => void
): void {
    const seedCount = SEED_COUNTS[algo];
    const seeds = seed64Array(seedCount);

    try {
        const gen = new RandomGenerator(algo, seeds);
        testFn(gen, seeds);
    } catch (error) {
        console.error(`\n❌ Test failed on iteration ${iteration} (${algo})`);
        console.error(`   Seeds: [${seeds.join(', ')}]`);
        console.error(`   To reproduce: const seeds = [${seeds.join('n, ')}n];`);
        throw error;
    }
}
