import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { createTestGenerator, createParallelGenerators, TEST_SEEDS, SEED_COUNTS, getSeedsForPRNG, DEFAULT_OUTPUT_ARRAY_SIZE, CUSTOM_ARRAY_SIZE_LARGE, JUMP_REFERENCE, TEST_STREAM_IDS, INTEGRATION_SAMPLE_SIZE } from '../helpers/test-utils';

describe('RandomGenerator', () => {
    describe('Constructor', () => {
        it('should create a generator with default settings', () => {
            const gen = new RandomGenerator();

            expect(gen).toBeInstanceOf(RandomGenerator);
            expect(gen.prngType).toBe(PRNGType.Xoroshiro128Plus_SIMD);
            expect(gen.outputArraySize).toBe(DEFAULT_OUTPUT_ARRAY_SIZE);
        });

        it('should create a generator with specified PRNG type', () => {
            const gen = new RandomGenerator(PRNGType.PCG);

            expect(gen.prngType).toBe(PRNGType.PCG);
        });

        it('should create a generator with custom seeds', () => {
            const seeds = TEST_SEEDS.double;
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);

            expect(gen.seeds).toEqual(seeds);
        });

        it('should create Xoroshiro128Plus generators with unique stream IDs that produce non-overlapping sequences', () => {
            const numGenerators = 3;
            const [gen1, gen2, gen3] = createParallelGenerators(numGenerators, PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            // Validate first value from gen1 (uniqueStreamId=1) matches C reference
            const firstValue = gen1.float();
            expect(firstValue).toBe(JUMP_REFERENCE.XOROSHIRO128PLUS);

            // Generate sequences from each stream to verify independence
            const seq1: number[] = [];
            const seq2: number[] = [];
            const seq3: number[] = [];

            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                seq1.push(gen1.float());
                seq2.push(gen2.float());
                seq3.push(gen3.float());
            }

            // Point-level check: values at same position should differ (100% different per stream selection standard)
            let diff12 = 0, diff13 = 0, diff23 = 0;
            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                if (seq1[i] !== seq2[i]) diff12++;
                if (seq1[i] !== seq3[i]) diff13++;
                if (seq2[i] !== seq3[i]) diff23++;
            }

            expect(diff12).toBe(INTEGRATION_SAMPLE_SIZE); // All values at corresponding positions differ
            expect(diff13).toBe(INTEGRATION_SAMPLE_SIZE);
            expect(diff23).toBe(INTEGRATION_SAMPLE_SIZE);

            // Sequence-level check: no value from seq1 should appear anywhere in seq2 or seq3
            const set1 = new Set(seq1);
            const set2 = new Set(seq2);
            const set3 = new Set(seq3);

            let overlap_1_2 = 0;
            let overlap_1_3 = 0;
            let overlap_2_3 = 0;

            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                if (set2.has(seq1[i])) overlap_1_2++;
                if (set3.has(seq1[i])) overlap_1_3++;
                if (set3.has(seq2[i])) overlap_2_3++;
            }

            // Allow up to 1 collision due to birthday paradox (very generous)
            expect(overlap_1_2).toBeLessThanOrEqual(1); // Streams should not overlap
            expect(overlap_1_3).toBeLessThanOrEqual(1);
            expect(overlap_2_3).toBeLessThanOrEqual(1);
        });

        it('should create Xoshiro256Plus generators with unique stream IDs that produce non-overlapping sequences', () => {
            const numGenerators = 3;
            const [gen1, gen2, gen3] = createParallelGenerators(numGenerators, PRNGType.Xoshiro256Plus, TEST_SEEDS.quad);

            // Validate first value from gen1 (uniqueStreamId=1) matches C reference
            const firstValue = gen1.float();
            expect(firstValue).toBe(JUMP_REFERENCE.XOSHIRO256PLUS);

            // Generate sequences from each stream to verify independence
            const seq1: number[] = [];
            const seq2: number[] = [];
            const seq3: number[] = [];

            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                seq1.push(gen1.float());
                seq2.push(gen2.float());
                seq3.push(gen3.float());
            }

            // Point-level check: values at same position should differ (100% different per stream selection standard)
            let diff12 = 0, diff13 = 0, diff23 = 0;
            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                if (seq1[i] !== seq2[i]) diff12++;
                if (seq1[i] !== seq3[i]) diff13++;
                if (seq2[i] !== seq3[i]) diff23++;
            }

            expect(diff12).toBe(INTEGRATION_SAMPLE_SIZE); // All values at corresponding positions differ
            expect(diff13).toBe(INTEGRATION_SAMPLE_SIZE);
            expect(diff23).toBe(INTEGRATION_SAMPLE_SIZE);

            // Sequence-level check: no value from seq1 should appear anywhere in seq2 or seq3
            const set1 = new Set(seq1);
            const set2 = new Set(seq2);
            const set3 = new Set(seq3);

            let overlap_1_2 = 0;
            let overlap_1_3 = 0;
            let overlap_2_3 = 0;

            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                if (set2.has(seq1[i])) overlap_1_2++;
                if (set3.has(seq1[i])) overlap_1_3++;
                if (set3.has(seq2[i])) overlap_2_3++;
            }

            // Allow up to 1 collision due to birthday paradox (very generous)
            expect(overlap_1_2).toBeLessThanOrEqual(1); // Streams should not overlap
            expect(overlap_1_3).toBeLessThanOrEqual(1);
            expect(overlap_2_3).toBeLessThanOrEqual(1);
        });

        it('should create Xoroshiro128Plus_SIMD generators with unique stream IDs that produce non-overlapping sequences across both lanes', () => {
            // SIMD generators have 2 lanes. Array methods use both lanes (interleaved).
            // This test verifies jump() correctly advances both lanes without creating
            // cross-stream, cross-lane overlaps (similar to AS SIMD jump tests).
            const numGenerators = 3;
            const [gen1, gen2, gen3] = createParallelGenerators(numGenerators, PRNGType.Xoroshiro128Plus_SIMD, TEST_SEEDS.quad);

            // Use array methods which exercise both lanes (values interleaved: lane0, lane1, lane0, lane1, ...)
            const arr1 = Array.from(gen1.floatArray());
            const arr2 = Array.from(gen2.floatArray());
            const arr3 = Array.from(gen3.floatArray());

            // Validate first values from gen1 match C reference for both lanes
            expect(arr1[0]).toBe(JUMP_REFERENCE.XOROSHIRO128PLUS); // Lane 0
            expect(arr1[1]).toBe(JUMP_REFERENCE.XOROSHIRO128PLUS_SIMD_LANE1); // Lane 1

            // Point-level check: values at same position should differ
            let diff12 = 0, diff13 = 0, diff23 = 0;
            for (let i = 0; i < arr1.length; i++) {
                if (arr1[i] !== arr2[i]) diff12++;
                if (arr1[i] !== arr3[i]) diff13++;
                if (arr2[i] !== arr3[i]) diff23++;
            }

            expect(diff12).toBe(arr1.length); // All values at corresponding positions differ
            expect(diff13).toBe(arr1.length);
            expect(diff23).toBe(arr1.length);

            // Sequence-level check: no value from arr1 should appear anywhere in arr2 or arr3
            const set1 = new Set(arr1);
            const set2 = new Set(arr2);
            const set3 = new Set(arr3);

            let overlap_1_2 = 0;
            let overlap_1_3 = 0;
            let overlap_2_3 = 0;

            for (let i = 0; i < arr1.length; i++) {
                if (set2.has(arr1[i])) overlap_1_2++;
                if (set3.has(arr1[i])) overlap_1_3++;
                if (set3.has(arr2[i])) overlap_2_3++;
            }

            // Allow up to 1 collision due to birthday paradox
            expect(overlap_1_2).toBeLessThanOrEqual(1); // SIMD streams (both lanes) should not overlap
            expect(overlap_1_3).toBeLessThanOrEqual(1);
            expect(overlap_2_3).toBeLessThanOrEqual(1);
        });

        it('should create Xoshiro256Plus_SIMD generators with unique stream IDs that produce non-overlapping sequences across both lanes', () => {
            // SIMD generators have 2 lanes. Array methods use both lanes (interleaved).
            // This test verifies jump() correctly advances both lanes without creating
            // cross-stream, cross-lane overlaps (similar to AS SIMD jump tests).
            const numGenerators = 3;
            const [gen1, gen2, gen3] = createParallelGenerators(numGenerators, PRNGType.Xoshiro256Plus_SIMD, TEST_SEEDS.octet);

            // Use array methods which exercise both lanes (values interleaved: lane0, lane1, lane0, lane1, ...)
            const arr1 = Array.from(gen1.floatArray());
            const arr2 = Array.from(gen2.floatArray());
            const arr3 = Array.from(gen3.floatArray());

            // Validate first values from gen1 match C reference for both lanes
            expect(arr1[0]).toBe(JUMP_REFERENCE.XOSHIRO256PLUS); // Lane 0
            expect(arr1[1]).toBe(JUMP_REFERENCE.XOSHIRO256PLUS_SIMD_LANE1); // Lane 1

            // Point-level check: values at same position should differ
            let diff12 = 0, diff13 = 0, diff23 = 0;
            for (let i = 0; i < arr1.length; i++) {
                if (arr1[i] !== arr2[i]) diff12++;
                if (arr1[i] !== arr3[i]) diff13++;
                if (arr2[i] !== arr3[i]) diff23++;
            }

            expect(diff12).toBe(arr1.length); // All values at corresponding positions differ
            expect(diff13).toBe(arr1.length);
            expect(diff23).toBe(arr1.length);

            // Sequence-level check: no value from arr1 should appear anywhere in arr2 or arr3
            const set1 = new Set(arr1);
            const set2 = new Set(arr2);
            const set3 = new Set(arr3);

            let overlap_1_2 = 0;
            let overlap_1_3 = 0;
            let overlap_2_3 = 0;

            for (let i = 0; i < arr1.length; i++) {
                if (set2.has(arr1[i])) overlap_1_2++;
                if (set3.has(arr1[i])) overlap_1_3++;
                if (set3.has(arr2[i])) overlap_2_3++;
            }

            // Allow up to 1 collision due to birthday paradox
            expect(overlap_1_2).toBeLessThanOrEqual(1); // SIMD streams (both lanes) should not overlap
            expect(overlap_1_3).toBeLessThanOrEqual(1);
            expect(overlap_2_3).toBeLessThanOrEqual(1);
        });

        it('should handle high stream IDs and validate correctness (catches mask regression bugs)', () => {
            // Stream IDs LOW, MID, HIGH test bit positions that would expose mask regression bugs
            // (MID requires bit 5, HIGH requires bit 6 of the upper 32 bits)
            const genLow = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double, TEST_STREAM_IDS.LOW);
            const genMid = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double, TEST_STREAM_IDS.MID);
            const genHigh = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double, TEST_STREAM_IDS.HIGH);

            // Validate first value from LOW stream matches C reference (jump once, then float once)
            expect(genLow.float()).toBe(JUMP_REFERENCE.XOROSHIRO128PLUS);

            // Generate sequences from each (starting from second value for LOW)
            const seqLow: number[] = [];
            const seqMid: number[] = [];
            const seqHigh: number[] = [];

            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                seqLow.push(genLow.float());
                seqMid.push(genMid.float());
                seqHigh.push(genHigh.float());
            }

            // Point-level check: all values at same position should differ
            let diffLowMid = 0, diffLowHigh = 0, diffMidHigh = 0;
            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                if (seqLow[i] !== seqMid[i]) diffLowMid++;
                if (seqLow[i] !== seqHigh[i]) diffLowHigh++;
                if (seqMid[i] !== seqHigh[i]) diffMidHigh++;
            }

            expect(diffLowMid).toBe(INTEGRATION_SAMPLE_SIZE);
            expect(diffLowHigh).toBe(INTEGRATION_SAMPLE_SIZE);
            expect(diffMidHigh).toBe(INTEGRATION_SAMPLE_SIZE);

            // Sequence-level check: no cross-stream overlap
            const setLow = new Set(seqLow);
            const setMid = new Set(seqMid);
            const setHigh = new Set(seqHigh);

            let overlapLowMid = 0, overlapLowHigh = 0, overlapMidHigh = 0;
            for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                if (setMid.has(seqLow[i])) overlapLowMid++;
                if (setHigh.has(seqLow[i])) overlapLowHigh++;
                if (setHigh.has(seqMid[i])) overlapMidHigh++;
            }

            expect(overlapLowMid).toBeLessThanOrEqual(1);
            expect(overlapLowHigh).toBeLessThanOrEqual(1);
            expect(overlapMidHigh).toBeLessThanOrEqual(1);
        });

        it('should auto-seed when seeds not provided', () => {
            const gen1 = new RandomGenerator();
            const gen2 = new RandomGenerator();

            expect(gen1.seeds).not.toBe(gen2.seeds);

            // Auto-seeded generators should produce different sequences
            expect(gen1.float()).not.toBe(gen2.float());
        });

        it('should accept even-size arrays for SIMD algorithms', () => {
            const evenSize = 100;
            expect(() => {
                const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, null, null, evenSize);
                gen.floatArray();
            }).not.toThrow();
        });
    });

    describe('seedCount getter', () => {
        it('should return correct seed count for each PRNG type', () => {
            for (const [type, expectedCount] of Object.entries(SEED_COUNTS)) {
                const prngType = type as PRNGType;
                const seeds = getSeedsForPRNG(prngType);
                const gen = new RandomGenerator(prngType, seeds);

                expect(gen.seedCount).toBe(expectedCount);
            }
        });
    });

    describe('seeds getter', () => {
        it('should get seeds', () => {
            const seeds = TEST_SEEDS.double;
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);

            expect(gen.seeds).toEqual(seeds);
        });

        it('should be immutable after construction', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            expect(gen.seeds).toEqual(TEST_SEEDS.double);

            // Verify no setter exists
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gen), 'seeds');
            expect(descriptor?.set).toBeUndefined();
        });
    });

    describe('outputArraySize getter', () => {
        it('should get output array size', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, null, null, CUSTOM_ARRAY_SIZE_LARGE);

            expect(gen.outputArraySize).toBe(CUSTOM_ARRAY_SIZE_LARGE);
        });

        it('should be immutable after construction', () => {
            const gen = createTestGenerator();

            expect(gen.outputArraySize).toBe(DEFAULT_OUTPUT_ARRAY_SIZE);

            // Verify no setter exists
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gen), 'outputArraySize');
            expect(descriptor?.set).toBeUndefined();
        });
    });

    describe('int64()', () => {
        it('should generate 64-bit integers', () => {
            const gen = createTestGenerator();
            const value = gen.int64();

            expect(typeof value).toBe('bigint');
            expect(value >= 0n).toBe(true);
            expect(value <= 0xFFFFFFFFFFFFFFFFn).toBe(true);
        });

        it('should generate different values on consecutive calls', () => {
            const gen = createTestGenerator();
            const values = new Set<bigint>();

            for (let i = 0; i < 100; i++) {
                values.add(gen.int64());
            }

            // All values should be unique (statistically very likely)
            expect(values.size).toBe(100);
        });
    });

    describe('int53()', () => {
        it('should generate 53-bit integers as numbers', () => {
            const gen = createTestGenerator();
            const value = gen.int53();

            expect(typeof value).toBe('number');
            expect(Number.isInteger(value)).toBe(true);
            expect(value >= 0).toBe(true);
            expect(value <= Number.MAX_SAFE_INTEGER).toBe(true);
        });
    });

    describe('int32()', () => {
        it('should generate 32-bit integers as numbers', () => {
            const gen = createTestGenerator();
            const value = gen.int32();

            expect(typeof value).toBe('number');
            expect(Number.isInteger(value)).toBe(true);
            expect(value >= 0).toBe(true);
            expect(value <= 0xFFFFFFFF).toBe(true);
        });
    });

    describe('float()', () => {
        it('should generate floats in [0, 1)', () => {
            const gen = createTestGenerator();

            for (let i = 0; i < 1000; i++) {
                const value = gen.float();

                expect(typeof value).toBe('number');
                expect(value >= 0).toBe(true);
                expect(value < 1).toBe(true);
            }
        });
    });

    describe('coord()', () => {
        it('should generate coordinates in [-1, 1)', () => {
            const gen = createTestGenerator();

            for (let i = 0; i < 1000; i++) {
                const value = gen.coord();

                expect(typeof value).toBe('number');
                expect(value >= -1).toBe(true);
                expect(value < 1).toBe(true);
            }
        });
    });

    describe('coordSquared()', () => {
        it('should generate squared coordinates in [0, 1)', () => {
            const gen = createTestGenerator();

            for (let i = 0; i < 1000; i++) {
                const value = gen.coordSquared();

                expect(typeof value).toBe('number');
                expect(value >= 0).toBe(true);
                expect(value < 1).toBe(true);
            }
        });

        it('should match manually squared coord() values', () => {
            const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);
            const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            for (let i = 0; i < 100; i++) {
                const coordValue = gen1.coord();
                const coordSquaredValue = gen2.coordSquared();
                const manualSquared = coordValue * coordValue;

                expect(coordSquaredValue).toBeCloseTo(manualSquared, 10);
            }
        });
    });

    describe('Instance Independence', () => {
        it('should maintain independent state across instances with same seeds', () => {
            const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);
            const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            // Fill arrays
            const array1 = gen1.floatArray();
            const values1 = Array.from(array1);

            const array2 = gen2.floatArray();
            const values2 = Array.from(array2);

            // Should have same values (same seeds, same position)
            expect(values1).toEqual(values2);

            // Advance gen1's state
            const array1b = gen1.floatArray();
            const values1b = Array.from(array1b);
            expect(values1b).not.toEqual(values1);

            // gen2's next array should match gen1's second array (same progression)
            const array2b = gen2.floatArray();
            const values2b = Array.from(array2b);

            expect(values1b).toEqual(values2b);
        });

        it('should keep independent state when instances advance differently', () => {
            const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);
            const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            // Advance gen1 more than gen2
            for (let i = 0; i < 10; i++) {
                gen1.float();
            }

            gen2.float();

            // They should be at different points in their sequences
            const seq1 = [];
            const seq2 = [];

            for (let i = 0; i < 5; i++) {
                seq1.push(gen1.float());
                seq2.push(gen2.float());
            }

            expect(seq1).not.toEqual(seq2);
        });
    });
});
