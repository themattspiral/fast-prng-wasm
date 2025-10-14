import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { createTestGenerator, TEST_SEEDS } from '../helpers/test-utils';

describe('Memory Management', () => {
    describe('Array Allocation', () => {
        it('should allocate arrays on construction', () => {
            const gen = createTestGenerator();

            // Arrays should be available immediately
            expect(gen.floatArray()).toBeDefined();
            expect(gen.int64Array()).toBeDefined();
        });

        it('should allocate separate buffers for float and int arrays', () => {
            const gen = createTestGenerator();

            const floatArray = gen.floatArray();
            const intArray = gen.int64Array();

            // Different references - separate memory allocations
            expect(floatArray).not.toBe(intArray);
        });

        it('should handle multiple independent array allocations across generators', () => {
            const generators = [];

            for (let i = 0; i < 10; i++) {
                generators.push(createTestGenerator());
            }

            // All generators should have independent arrays
            const arrays = generators.map(g => g.floatArray());

            // Each should be a different reference
            for (let i = 0; i < arrays.length; i++) {
                for (let j = i + 1; j < arrays.length; j++) {
                    expect(arrays[i]).not.toBe(arrays[j]);
                }
            }
        });
    });

    describe('Memory Limits', () => {
        it('should handle reasonably sized arrays within WASM memory constraints', () => {
            // 1 WASM page = 64KB total
            // With 2 arrays (BigUint64Array + Float64Array), ~2KB is reasonable
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double, null, 2000);

            const floatArray = gen.floatArray();
            const intArray = gen.int64Array();

            expect(floatArray).toHaveLength(2000);
            expect(intArray).toHaveLength(2000);
            expect(floatArray[0]).toBeDefined();
            expect(floatArray[1999]).toBeDefined();
        });

        it('should fail when attempting to allocate arrays exceeding WASM memory', () => {
            // 1 WASM page = 64KB
            // Each array needs space: BigUint64Array (8 bytes/elem) + Float64Array (8 bytes/elem)
            // Plus overhead. 5000 elements = ~80KB total, exceeds 64KB limit
            expect(() => {
                new RandomGenerator(PRNGType.Xoroshiro128Plus, TEST_SEEDS.double, null, 5000);
            }).toThrow();
        });
    });
});
