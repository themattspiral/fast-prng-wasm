import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';

import { TEST_SEEDS, TEST_SEEDS_ALT, createTestGenerator, generateSequence, DEFAULT_OUTPUT_ARRAY_SIZE, CUSTOM_ARRAY_SIZE_SMALL, getSeedsForPRNG, ALL_PRNG_TYPES, NON_SIMD_PRNG_TYPES, UINT32_MAX, UINT64_MAX, SIMD_LANE_COUNT } from '../helpers/test-utils';

/**
 * Array Behavior Tests
 *
 * Tests array-specific behaviors across all 5 generator types. Array fill logic is
 * duplicated in each AS generator for performance, requiring multi-generator coverage
 * of stream consistency, value ranges, and array types.
 *
 * Contrast with wrapper-api.test.ts (shallow smoke tests verifying methods execute) and
 * statistical-validation.test.ts (larger sample size, statistical quality tests).
 */
describe('Array Behavior', () => {
    // Buffer reuse tests array-specific wrapper logic only, so just do it with one generator
    describe('RandomGenerator Wrapper Buffer Reuse', () => {
        it('floatArray() should reuse same buffer', () => {
            const gen = createTestGenerator();

            const array1 = gen.floatArray();
            const array2 = gen.floatArray();

            // Same reference
            expect(array1).toBe(array2);
        });

        it('int64Array() should reuse same buffer', () => {
            const gen = createTestGenerator();

            const array1 = gen.int64Array();
            const array2 = gen.int64Array();

            // Same reference
            expect(array1).toBe(array2);
        });

        it('reused buffer should have different values after refill', () => {
            const gen = createTestGenerator();

            const array1 = gen.floatArray();
            const firstValue = array1[0];

            const array2 = gen.floatArray();

            // Same buffer reference
            expect(array1).toBe(array2);
            // But values have changed
            expect(array1[0]).not.toBe(firstValue);
            expect(array1[0]).toBe(array2[0]); // Both point to new values
        });

        it('floatArray(copy=true) should return independent copies', () => {
            const gen = createTestGenerator();

            const array1 = gen.floatArray(true);
            const array2 = gen.floatArray(true);

            // Different references
            expect(array1).not.toBe(array2);
            // Different values (generator advanced)
            expect(array1[0]).not.toBe(array2[0]);
        });

        it('int64Array(copy=true) should return independent copies', () => {
            const gen = createTestGenerator();

            const array1 = gen.int64Array(true);
            const array2 = gen.int64Array(true);

            // Different references
            expect(array1).not.toBe(array2);
            // Different values (generator advanced)
            expect(array1[0]).not.toBe(array2[0]);
        });

        it('int53Array(copy=true) should return independent copies', () => {
            const gen = createTestGenerator();

            const array1 = gen.int53Array(true);
            const array2 = gen.int53Array(true);

            // Different references
            expect(array1).not.toBe(array2);
            // Different values (generator advanced)
            expect(array1[0]).not.toBe(array2[0]);
        });

        it('int32Array(copy=true) should return independent copies', () => {
            const gen = createTestGenerator();

            const array1 = gen.int32Array(true);
            const array2 = gen.int32Array(true);

            // Different references
            expect(array1).not.toBe(array2);
            // Different values (generator advanced)
            expect(array1[0]).not.toBe(array2[0]);
        });

        it('coordArray(copy=true) should return independent copies', () => {
            const gen = createTestGenerator();

            const array1 = gen.coordArray(true);
            const array2 = gen.coordArray(true);

            // Different references
            expect(array1).not.toBe(array2);
            // Different values (generator advanced)
            expect(array1[0]).not.toBe(array2[0]);
        });

        it('coordSquaredArray(copy=true) should return independent copies', () => {
            const gen = createTestGenerator();

            const array1 = gen.coordSquaredArray(true);
            const array2 = gen.coordSquaredArray(true);

            // Different references
            expect(array1).not.toBe(array2);
            // Different values (generator advanced)
            expect(array1[0]).not.toBe(array2[0]);
        });

        it('copy parameter should preserve values when storing multiple arrays', () => {
            const gen = createTestGenerator();

            const array1 = gen.floatArray(true);
            const array1Value = array1[0];

            const array2 = gen.floatArray(true);

            // array1 values should be preserved
            expect(array1[0]).toBe(array1Value);
            // array2 should have different values
            expect(array2[0]).not.toBe(array1Value);
        });

        it('copy=false (and default) should maintain buffer reuse behavior (backward compatibility)', () => {
            const gen = createTestGenerator();

            const array1 = gen.floatArray(false);
            const array2 = gen.floatArray();  // Test default (no param) too

            // Same reference (buffer reuse) - both explicit false and default
            expect(array1).toBe(array2);
        });
    });

    // Stream consistency: Array fill logic duplicated in each AS generator.
    // Non-SIMD generators: array methods match repeated single-value calls.
    // SIMD generators tested separately (interleaved dual-lane output).
    describe('Array Fill Stream Consistency - Non-SIMD', () => {
        NON_SIMD_PRNG_TYPES.forEach(prngType => {
            describe(`${PRNGType[prngType]}`, () => {
                it('floatArray() should produce same sequence as repeated float() calls', () => {
                    const seeds = getSeedsForPRNG(prngType);
                    const gen1 = new RandomGenerator(prngType, seeds);
                    const gen2 = new RandomGenerator(prngType, seeds);

                    const singleValues = generateSequence<number>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'float');
                    const arrayValues = Array.from(gen2.floatArray());

                    expect(arrayValues).toEqual(singleValues);
                });

                it('int64Array() should produce same sequence as repeated int64() calls', () => {
                    const seeds = getSeedsForPRNG(prngType);
                    const gen1 = new RandomGenerator(prngType, seeds);
                    const gen2 = new RandomGenerator(prngType, seeds);

                    const singleValues = generateSequence<bigint>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'int64');
                    const arrayValues = Array.from(gen2.int64Array());

                    expect(arrayValues).toEqual(singleValues);
                });

                it('int53Array() should produce same sequence as repeated int53() calls', () => {
                    const seeds = getSeedsForPRNG(prngType);
                    const gen1 = new RandomGenerator(prngType, seeds);
                    const gen2 = new RandomGenerator(prngType, seeds);

                    const singleValues = generateSequence<number>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'int53');
                    const arrayValues = Array.from(gen2.int53Array());

                    expect(arrayValues).toEqual(singleValues);
                });

                it('int32Array() should produce same sequence as repeated int32() calls', () => {
                    const seeds = getSeedsForPRNG(prngType);
                    const gen1 = new RandomGenerator(prngType, seeds);
                    const gen2 = new RandomGenerator(prngType, seeds);

                    const singleValues = generateSequence<number>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'int32');
                    const arrayValues = Array.from(gen2.int32Array());

                    expect(arrayValues).toEqual(singleValues);
                });

                it('coordArray() should produce same sequence as repeated coord() calls', () => {
                    const seeds = getSeedsForPRNG(prngType);
                    const gen1 = new RandomGenerator(prngType, seeds);
                    const gen2 = new RandomGenerator(prngType, seeds);

                    const singleValues = generateSequence<number>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'coord');
                    const arrayValues = Array.from(gen2.coordArray());

                    expect(arrayValues).toEqual(singleValues);
                });

                it('coordSquaredArray() should produce same sequence as repeated coordSquared() calls', () => {
                    const seeds = getSeedsForPRNG(prngType);
                    const gen1 = new RandomGenerator(prngType, seeds);
                    const gen2 = new RandomGenerator(prngType, seeds);

                    const singleValues = generateSequence<number>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'coordSquared');
                    const arrayValues = Array.from(gen2.coordSquaredArray());

                    expect(arrayValues).toEqual(singleValues);
                });
            });
        });
    });

    // SIMD stream consistency: SIMD generators interleave dual-lane output in array methods.
    // We validate: (1) determinism with same seeds, (2) divergence with different seeds,
    // (3) lanes match their own non-SIMD sequences when using split seeds.
    describe('Array Fill Stream Consistency - SIMD', () => {
        describe('Xoroshiro128Plus_SIMD', () => {
            it('should produce deterministic interleaved output with identical seeds', () => {
                const seeds = TEST_SEEDS.quad; // [s0, s1, s2, s3] for lanes 0 and 1
                const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, seeds);
                const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, seeds);

                // Same seeds → identical interleaved output
                expect(Array.from(gen1.floatArray())).toEqual(Array.from(gen2.floatArray()));
                expect(Array.from(gen1.int64Array())).toEqual(Array.from(gen2.int64Array()));
            });

            it('should produce different interleaved streams when lanes have different seeds', () => {
                // Lane 0: TEST_SEEDS.double, Lane 1: TEST_SEEDS_ALT.double
                const seeds = [TEST_SEEDS.double[0], TEST_SEEDS.double[1], TEST_SEEDS_ALT.double[0], TEST_SEEDS_ALT.double[1]];
                const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, seeds);

                const interleavedArray = Array.from(gen.floatArray());

                // Even indices (lane 0) should differ from odd indices (lane 1)
                let differences = 0;
                for (let i = 0; i < DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT; i++) {
                    if (interleavedArray[i * SIMD_LANE_COUNT] !== interleavedArray[i * SIMD_LANE_COUNT + 1]) {
                        differences++;
                    }
                }
                // All lane0/lane1 pairs should differ
                expect(differences).toBe(DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT);
            });

            it('should interleave matching streams from both lanes', () => {
                // Lane 0: seeds[0,1], Lane 1: seeds[2,3]
                const seeds = TEST_SEEDS.quad;
                const simdGen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, seeds);
                const lane0Gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, [seeds[0], seeds[1]]);
                const lane1Gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, [seeds[2], seeds[3]]);

                const interleavedArray = Array.from(simdGen.floatArray());
                const lane0Array = generateSequence<number>(lane0Gen, DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT, 'float');
                const lane1Array = generateSequence<number>(lane1Gen, DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT, 'float');

                // Even indices should match lane 0, odd indices should match lane 1
                for (let i = 0; i < DEFAULT_OUTPUT_ARRAY_SIZE; i++) {
                    if (i % SIMD_LANE_COUNT === 0) {
                        expect(interleavedArray[i]).toBe(lane0Array[i / SIMD_LANE_COUNT]);
                    } else {
                        expect(interleavedArray[i]).toBe(lane1Array[(i - 1) / SIMD_LANE_COUNT]);
                    }
                }
            });
        });

        describe('Xoshiro256Plus_SIMD', () => {
            it('should produce deterministic interleaved output with identical seeds', () => {
                const seeds = TEST_SEEDS.octet; // [s0-s3, s4-s7] for lanes 0 and 1
                const gen1 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, seeds);
                const gen2 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, seeds);

                // Same seeds → identical interleaved output
                expect(Array.from(gen1.floatArray())).toEqual(Array.from(gen2.floatArray()));
                expect(Array.from(gen1.int64Array())).toEqual(Array.from(gen2.int64Array()));
            });

            it('should produce different interleaved streams when lanes have different seeds', () => {
                // Lane 0: TEST_SEEDS.quad, Lane 1: TEST_SEEDS_ALT.quad
                const seeds = [
                    TEST_SEEDS.quad[0], TEST_SEEDS.quad[1], TEST_SEEDS.quad[2], TEST_SEEDS.quad[3],
                    TEST_SEEDS_ALT.quad[0], TEST_SEEDS_ALT.quad[1], TEST_SEEDS_ALT.quad[2], TEST_SEEDS_ALT.quad[3]
                ];
                const gen = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, seeds);

                const interleavedArray = Array.from(gen.floatArray());

                // Even indices (lane 0) should differ from odd indices (lane 1)
                let differences = 0;
                for (let i = 0; i < DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT; i++) {
                    if (interleavedArray[i * SIMD_LANE_COUNT] !== interleavedArray[i * SIMD_LANE_COUNT + 1]) {
                        differences++;
                    }
                }
                // All lane0/lane1 pairs should differ
                expect(differences).toBe(DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT);
            });

            it('should interleave matching streams from both lanes', () => {
                // Lane 0: seeds[0-3], Lane 1: seeds[4-7]
                const seeds = TEST_SEEDS.octet;
                const simdGen = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, seeds);
                const lane0Gen = new RandomGenerator(PRNGType.Xoshiro256Plus, [seeds[0], seeds[1], seeds[2], seeds[3]]);
                const lane1Gen = new RandomGenerator(PRNGType.Xoshiro256Plus, [seeds[4], seeds[5], seeds[6], seeds[7]]);

                const interleavedArray = Array.from(simdGen.floatArray());
                const lane0Array = generateSequence<number>(lane0Gen, DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT, 'float');
                const lane1Array = generateSequence<number>(lane1Gen, DEFAULT_OUTPUT_ARRAY_SIZE / SIMD_LANE_COUNT, 'float');

                // Even indices should match lane 0, odd indices should match lane 1
                for (let i = 0; i < DEFAULT_OUTPUT_ARRAY_SIZE; i++) {
                    if (i % SIMD_LANE_COUNT === 0) {
                        expect(interleavedArray[i]).toBe(lane0Array[i / SIMD_LANE_COUNT]);
                    } else {
                        expect(interleavedArray[i]).toBe(lane1Array[(i - 1) / SIMD_LANE_COUNT]);
                    }
                }
            });
        });
    });

    describe('Array Sizes', () => {
        it('should respect default array size', () => {
            const gen = createTestGenerator();

            expect(gen.floatArray()).toHaveLength(DEFAULT_OUTPUT_ARRAY_SIZE);
            expect(gen.int64Array()).toHaveLength(DEFAULT_OUTPUT_ARRAY_SIZE);
            expect(gen.int53Array()).toHaveLength(DEFAULT_OUTPUT_ARRAY_SIZE);
            expect(gen.int32Array()).toHaveLength(DEFAULT_OUTPUT_ARRAY_SIZE);
            expect(gen.coordArray()).toHaveLength(DEFAULT_OUTPUT_ARRAY_SIZE);
            expect(gen.coordSquaredArray()).toHaveLength(DEFAULT_OUTPUT_ARRAY_SIZE);
        });

        it('should respect custom array size from constructor', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, null, null, CUSTOM_ARRAY_SIZE_SMALL);

            expect(gen.floatArray()).toHaveLength(CUSTOM_ARRAY_SIZE_SMALL);
            expect(gen.int64Array()).toHaveLength(CUSTOM_ARRAY_SIZE_SMALL);
        });

        it('should handle very small array sizes', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, null, null, 1);

            expect(gen.floatArray()).toHaveLength(1);
            expect(gen.int64Array()).toHaveLength(1);
        });
    });

    // Value ranges: Test conversions work correctly across all implementations
    describe('Array Value Ranges', () => {
        ALL_PRNG_TYPES.forEach(prngType => {
            describe(`${PRNGType[prngType]}`, () => {
                it('floatArray() values should be in [0, 1)', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.floatArray();

                    for (const value of array) {
                        expect(value).toBeGreaterThanOrEqual(0);
                        expect(value).toBeLessThan(1);
                    }
                });

                it('int64Array() values should be in valid range', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.int64Array();

                    for (const value of array) {
                        expect(value).toBeGreaterThanOrEqual(0n);
                        expect(value).toBeLessThanOrEqual(UINT64_MAX);
                    }
                });

                it('int53Array() values should be in valid range', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.int53Array();

                    for (const value of array) {
                        expect(Number.isSafeInteger(value)).toBe(true);
                        expect(value).toBeGreaterThanOrEqual(0);
                        expect(value).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
                    }
                });

                it('int32Array() values should be in valid range', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.int32Array();

                    for (const value of array) {
                        expect(Number.isInteger(value)).toBe(true);
                        expect(value).toBeGreaterThanOrEqual(0);
                        expect(value).toBeLessThanOrEqual(UINT32_MAX);
                    }
                });

                it('coordArray() values should be in [-1, 1)', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.coordArray();

                    for (const value of array) {
                        expect(value).toBeGreaterThanOrEqual(-1);
                        expect(value).toBeLessThan(1);
                    }
                });

                it('coordSquaredArray() values should be in [0, 1)', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.coordSquaredArray();

                    for (const value of array) {
                        expect(value).toBeGreaterThanOrEqual(0);
                        expect(value).toBeLessThan(1);
                    }
                });
            });
        });
    });

    // Array types: Ensure correct type handling across all implementations
    describe('Array Types', () => {
        ALL_PRNG_TYPES.forEach(prngType => {
            describe(`${PRNGType[prngType]}`, () => {
                it('int64Array() should return BigUint64Array', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.int64Array();

                    expect(array).toBeInstanceOf(BigUint64Array);
                });

                it('floatArray() should return Float64Array', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.floatArray();

                    expect(array).toBeInstanceOf(Float64Array);
                });

                it('int53Array() should return Float64Array', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.int53Array();

                    expect(array).toBeInstanceOf(Float64Array);
                });

                it('int32Array() should return Float64Array', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.int32Array();

                    expect(array).toBeInstanceOf(Float64Array);
                });

                it('coordArray() should return Float64Array', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.coordArray();

                    expect(array).toBeInstanceOf(Float64Array);
                });

                it('coordSquaredArray() should return Float64Array', () => {
                    const gen = new RandomGenerator(prngType);
                    const array = gen.coordSquaredArray();

                    expect(array).toBeInstanceOf(Float64Array);
                });
            });
        });
    });
});
