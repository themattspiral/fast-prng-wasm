/**
 * Common test utilities and helper functions
 */

import { RandomGenerator, PRNGType } from 'fast-prng-wasm';

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
 * Reference values for jump() validation.
 * These are the expected first float values after calling jump() once with TEST_SEEDS,
 * then generating the next value (via float(), floatArray()[0], etc.).
 *
 * Generated and verified by: src/assembly/test/c-reference/validate-jump.c
 * To regenerate: npm run test:c-ref
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

/**
 * Stream IDs for testing jump functionality.
 * These values test different bit positions in the jump polynomial to catch mask regressions.
 */
export const TEST_STREAM_IDS = {
    /** Low stream ID for basic testing */
    LOW: 1n,
    /** Mid-range stream ID (requires bit 5 in upper 32 bits) */
    MID: 40n,
    /** High stream ID (requires bit 6 in upper 32 bits) */
    HIGH: 65n
};

/**
 * Sample size for integration tests (matches AS DETERMINISTIC_SAMPLE_SIZE).
 */
export const INTEGRATION_SAMPLE_SIZE = 1000;
