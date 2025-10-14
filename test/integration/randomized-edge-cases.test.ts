import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType, seed64Array } from 'fast-prng-wasm';
import { getSeedsForPRNG, SEED_COUNTS } from '../helpers/test-utils';

/**
 * Randomized Testing
 *
 * This suite runs with different random seeds on each test run to catch
 * potential edge cases that fixed seeds might miss. Each test runs multiple
 * iterations with freshly generated random seeds.
 *
 * These tests complement (not replace) the deterministic test suite.
 */
describe('Randomized Edge Case Testing', () => {
    const ITERATION_COUNT = 10; // Run each test 10 times with different seeds
    const TEST_SAMPLE_SIZE = 1000; // Smaller than main tests for speed

    const ALL_ALGORITHMS = [
        PRNGType.PCG,
        PRNGType.Xoroshiro128Plus,
        PRNGType.Xoroshiro128Plus_SIMD,
        PRNGType.Xoshiro256Plus,
        PRNGType.Xoshiro256Plus_SIMD
    ];

    describe('Determinism with Random Seeds', () => {
        for (const algo of ALL_ALGORITHMS) {
            it(`${algo}: should maintain determinism across random seed values`, () => {
                for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                    // Generate random seeds for this iteration
                    const seedCount = SEED_COUNTS[algo];
                    const seeds = seed64Array(seedCount);

                    const gen1 = new RandomGenerator(algo, seeds);
                    const gen2 = new RandomGenerator(algo, seeds);

                    // Generate sequences from both generators
                    const seq1: number[] = [];
                    const seq2: number[] = [];

                    for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                        seq1.push(gen1.float());
                        seq2.push(gen2.float());
                    }

                    // All values must match exactly
                    expect(seq1).toEqual(seq2);
                }
            });
        }
    });

    describe('Range Validation with Random Seeds', () => {
        it('float() should stay in [0, 1) with random seeds', () => {
            for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                const seeds = seed64Array(4); // Works for all SIMD/non-SIMD
                const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds.slice(0, 2));

                for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                    const value = gen.float();
                    expect(value >= 0).toBe(true);
                    expect(value < 1).toBe(true);
                }
            }
        });

        it('coord() should stay in [-1, 1) with random seeds', () => {
            for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                const seeds = seed64Array(4);
                const gen = new RandomGenerator(PRNGType.Xoshiro256Plus, seeds);

                for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                    const value = gen.coord();
                    expect(value >= -1).toBe(true);
                    expect(value < 1).toBe(true);
                }
            }
        });

        it('int64() should stay in valid 64-bit range with random seeds', () => {
            for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                const seeds = seed64Array(2);
                const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);

                for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                    const value = gen.int64();
                    expect(value >= 0n).toBe(true);
                    expect(value <= 0xFFFFFFFFFFFFFFFFn).toBe(true);
                }
            }
        });
    });

    describe('Uniqueness with Random Seeds', () => {
        for (const algo of ALL_ALGORITHMS) {
            it(`${algo}: should produce unique values with random seeds`, () => {
                for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                    const seedCount = SEED_COUNTS[algo];
                    const seeds = seed64Array(seedCount);
                    const gen = new RandomGenerator(algo, seeds);

                    const values = new Set<bigint>();
                    for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                        values.add(gen.int64());
                    }

                    // All values should be unique (collision probability ~10^-12)
                    expect(values.size).toBe(TEST_SAMPLE_SIZE);
                }
            });
        }
    });

    describe('Basic Distribution Check with Random Seeds', () => {
        it('should spread across quartiles with random seeds', () => {
            for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                const seeds = seed64Array(4);
                const gen = new RandomGenerator(PRNGType.Xoshiro256Plus, seeds);

                let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
                for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                    const val = gen.float();
                    if (val < 0.25) q1++;
                    else if (val < 0.5) q2++;
                    else if (val < 0.75) q3++;
                    else q4++;
                }

                // Very loose bounds - just checking it's not completely broken
                // Expect ~250 per quartile, allow 150-350 range (40% tolerance)
                expect(q1).toBeGreaterThan(150);
                expect(q1).toBeLessThan(350);
                expect(q2).toBeGreaterThan(150);
                expect(q2).toBeLessThan(350);
                expect(q3).toBeGreaterThan(150);
                expect(q3).toBeLessThan(350);
                expect(q4).toBeGreaterThan(150);
                expect(q4).toBeLessThan(350);
            }
        });
    });

    describe('Array Method Consistency with Random Seeds', () => {
        it('floatArray() should match repeated float() calls with random seeds', () => {
            for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                const seeds = seed64Array(2);
                const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);
                const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);

                // Generate using single-value method
                const singleValues: number[] = [];
                for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                    singleValues.push(gen1.float());
                }

                // Generate using array method
                const arrayValues = Array.from(gen2.floatArray()).slice(0, TEST_SAMPLE_SIZE);

                expect(arrayValues).toEqual(singleValues);
            }
        });
    });

    describe('Stream Independence with Random Seeds', () => {
        it('different stream IDs should produce independent sequences with random seeds', () => {
            for (let iteration = 0; iteration < ITERATION_COUNT; iteration++) {
                const seeds = seed64Array(2);
                const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds, 1n);
                const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds, 2n);

                let differentCount = 0;
                for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
                    if (gen1.float() !== gen2.float()) {
                        differentCount++;
                    }
                }

                // All values should differ (different streams are completely independent)
                expect(differentCount).toBe(TEST_SAMPLE_SIZE);
            }
        });
    });
});
