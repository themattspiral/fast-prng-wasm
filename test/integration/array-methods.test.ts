import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';

import { TEST_SEEDS, createTestGenerator, generateSequence, DEFAULT_OUTPUT_ARRAY_SIZE, CUSTOM_ARRAY_SIZE_SMALL } from '../helpers/test-utils';

describe('Array Methods', () => {
    describe('Buffer Reuse', () => {
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
    });

    describe('Stream Consistency', () => {
        it('floatArray() should produce same sequence as repeated float() calls', () => {
            const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);
            const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            // Generate using single-value method
            const singleValues = generateSequence<number>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'float');

            // Generate using array method
            const arrayValues = Array.from(gen2.floatArray());

            expect(arrayValues).toEqual(singleValues);
        });

        it('int64Array() should produce same sequence as repeated int64() calls', () => {
            const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);
            const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            // Generate using single-value method
            const singleValues = generateSequence<bigint>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'int64');

            // Generate using array method
            const arrayValues = Array.from(gen2.int64Array());

            expect(arrayValues).toEqual(singleValues);
        });

        it('coordArray() should produce same sequence as repeated coord() calls', () => {
            const gen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);
            const gen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double);

            // Generate using single-value method
            const singleValues = generateSequence<number>(gen1, DEFAULT_OUTPUT_ARRAY_SIZE, 'coord');

            // Generate using array method
            const arrayValues = Array.from(gen2.coordArray());

            expect(arrayValues).toEqual(singleValues);
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

    describe('Array Value Ranges', () => {
        it('floatArray() values should be in [0, 1)', () => {
            const gen = createTestGenerator();
            const array = gen.floatArray();

            for (const value of array) {
                expect(value >= 0).toBe(true);
                expect(value < 1).toBe(true);
            }
        });

        it('int64Array() values should be in valid range', () => {
            const gen = createTestGenerator();
            const array = gen.int64Array();

            for (const value of array) {
                expect(value >= 0n).toBe(true);
                expect(value <= 0xFFFFFFFFFFFFFFFFn).toBe(true);
            }
        });

        it('int53Array() values should be in valid range', () => {
            const gen = createTestGenerator();
            const array = gen.int53Array();

            for (const value of array) {
                expect(Number.isSafeInteger(value)).toBe(true);
                expect(value >= 0).toBe(true);
                expect(value <= Number.MAX_SAFE_INTEGER).toBe(true);
            }
        });

        it('int32Array() values should be in valid range', () => {
            const gen = createTestGenerator();
            const array = gen.int32Array();

            for (const value of array) {
                expect(Number.isInteger(value)).toBe(true);
                expect(value >= 0).toBe(true);
                expect(value <= 0xFFFFFFFF).toBe(true);
            }
        });

        it('coordArray() values should be in [-1, 1)', () => {
            const gen = createTestGenerator();
            const array = gen.coordArray();

            for (const value of array) {
                expect(value >= -1).toBe(true);
                expect(value < 1).toBe(true);
            }
        });

        it('coordSquaredArray() values should be in [0, 1)', () => {
            const gen = createTestGenerator();
            const array = gen.coordSquaredArray();

            for (const value of array) {
                expect(value >= 0).toBe(true);
                expect(value < 1).toBe(true);
            }
        });
    });

    describe('Array Types', () => {
        it('int64Array() should return BigUint64Array', () => {
            const gen = createTestGenerator();
            const array = gen.int64Array();

            expect(array).toBeInstanceOf(BigUint64Array);
        });

        it('floatArray() should return Float64Array', () => {
            const gen = createTestGenerator();
            const array = gen.floatArray();

            expect(array).toBeInstanceOf(Float64Array);
        });

        it('int53Array() should return Float64Array', () => {
            const gen = createTestGenerator();
            const array = gen.int53Array();

            expect(array).toBeInstanceOf(Float64Array);
        });

        it('int32Array() should return Float64Array', () => {
            const gen = createTestGenerator();
            const array = gen.int32Array();

            expect(array).toBeInstanceOf(Float64Array);
        });

        it('coordArray() should return Float64Array', () => {
            const gen = createTestGenerator();
            const array = gen.coordArray();

            expect(array).toBeInstanceOf(Float64Array);
        });

        it('coordSquaredArray() should return Float64Array', () => {
            const gen = createTestGenerator();
            const array = gen.coordSquaredArray();

            expect(array).toBeInstanceOf(Float64Array);
        });
    });
});
