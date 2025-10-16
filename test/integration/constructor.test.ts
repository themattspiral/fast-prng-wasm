/**
 * RandomGenerator Constructor Tests
 *
 * Tests for RandomGenerator construction, initialization, and getter methods.
 *
 * Test Strategy:
 * - Verify default construction behavior
 * - Validate constructor parameters (PRNG type, seeds, array size)
 * - Test auto-seeding behavior
 * - Verify getter immutability
 *
 * Contrast: This file focuses on object construction and state inspection (getters).
 * For runtime behavior (method outputs), see single-value-methods.test.ts.
 * For multi-instance scenarios, see independence.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { createTestGenerator, TEST_SEEDS, SEED_COUNTS, getSeedsForPRNG, DEFAULT_OUTPUT_ARRAY_SIZE, CUSTOM_ARRAY_SIZE_LARGE } from '../helpers/test-utils';

describe('RandomGenerator Basic Contruction and Access', () => {
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

        it('should auto-seed when seeds not provided', () => {
            const gen1 = new RandomGenerator();
            const gen2 = new RandomGenerator();

            expect(gen1.seeds).not.toBe(gen2.seeds);

            // Auto-seeded generators should produce different sequences
            expect(gen1.float()).not.toBe(gen2.float());
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
});
