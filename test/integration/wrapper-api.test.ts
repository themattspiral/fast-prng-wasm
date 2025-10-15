import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { createTestGenerator, createParallelGenerators, TEST_SEEDS, SEED_COUNTS, getSeedsForPRNG } from '../helpers/test-utils';

describe('RandomGenerator', () => {
    describe('Constructor', () => {
        it('should create a generator with default settings', () => {
            const gen = new RandomGenerator();

            expect(gen).toBeInstanceOf(RandomGenerator);
            expect(gen.prngType).toBe(PRNGType.Xoroshiro128Plus_SIMD);
            expect(gen.outputArraySize).toBe(1000);
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

        it('should create generators with unique stream IDs that produce independent sequences', () => {
            const [gen1, gen2, gen3] = createParallelGenerators(3, PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            // Generate 1000 values from each stream to verify independence
            const seq1: number[] = [];
            const seq2: number[] = [];
            const seq3: number[] = [];

            for (let i = 0; i < 1000; i++) {
                seq1.push(gen1.float());
                seq2.push(gen2.float());
                seq3.push(gen3.float());
            }

            // Count how many values differ between streams
            let diff12 = 0, diff13 = 0, diff23 = 0;
            for (let i = 0; i < 1000; i++) {
                if (seq1[i] !== seq2[i]) diff12++;
                if (seq1[i] !== seq3[i]) diff13++;
                if (seq2[i] !== seq3[i]) diff23++;
            }

            // Different stream IDs produce completely independent sequences - ALL values must differ
            expect(diff12).toBe(1000);
            expect(diff13).toBe(1000);
            expect(diff23).toBe(1000);
        });

        it('should throw error when insufficient seeds provided', () => {
            expect(() => {
                new RandomGenerator(PRNGType.Xoshiro256Plus, [1n]); // needs 4 seeds
            }).toThrow();
        });

        it('should auto-seed when seeds not provided', () => {
            const gen1 = new RandomGenerator();
            const gen2 = new RandomGenerator();

            expect(gen1.seeds).not.toBe(gen2.seeds);

            // Auto-seeded generators should produce different sequences
            expect(gen1.float()).not.toBe(gen2.float());
        });

        it.skip('should throw on zero-size arrays', () => {
            expect(() => {
                new RandomGenerator(PRNGType.Xoroshiro128Plus, null, null, 0);
            }).toThrow(/positive|greater|size/i);
        });

        it.skip('should throw on negative array sizes', () => {
            expect(() => {
                new RandomGenerator(PRNGType.Xoroshiro128Plus, null, null, -1);
            }).toThrow(/positive|greater|size/i);
        });

        it.skip('should throw on odd-size arrays for SIMD algorithms', () => {
            const simdTypes = [
                PRNGType.Xoroshiro128Plus_SIMD,
                PRNGType.Xoshiro256Plus_SIMD
            ];

            for (const type of simdTypes) {
                expect(() => {
                    new RandomGenerator(type, null, null, 101);  // Odd size
                }).toThrow(/even/i);
            }
        });

        it('should accept even-size arrays for SIMD algorithms', () => {
            expect(() => {
                const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, null, null, 100);  // Even size
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
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, null, null, 2000);

            expect(gen.outputArraySize).toBe(2000);
        });

        it('should be immutable after construction', () => {
            const gen = createTestGenerator();

            expect(gen.outputArraySize).toBe(1000);

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
