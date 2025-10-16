/**
 * RandomGenerator Instance Independence Tests
 *
 * Tests for independent state management across multiple RandomGenerator instances.
 *
 * Test Strategy:
 * - Create multiple instances with same seeds
 * - Verify they produce same initial sequences (determinism)
 * - Advance instances by different amounts
 * - Verify they maintain independent state (not shared/global)
 *
 * Contrast: This file tests that multiple RandomGenerator instances maintain
 * independent internal state (e.g., two instances with same seeds produce same
 * sequences but don't share state). For stream selection (different stream IDs
 * that produce non-overlapping sequences for parallel use), see
 * parallel-streams.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { TEST_SEEDS, INSTANCE_TEST_ADVANCE_COUNT, INSTANCE_TEST_SAMPLE_COUNT } from '../helpers/test-utils';

describe('RandomGenerator', () => {
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
            for (let i = 0; i < INSTANCE_TEST_ADVANCE_COUNT; i++) {
                gen1.float();
            }

            gen2.float();

            // They should be at different points in their sequences
            const seq1 = [];
            const seq2 = [];

            for (let i = 0; i < INSTANCE_TEST_SAMPLE_COUNT; i++) {
                seq1.push(gen1.float());
                seq2.push(gen2.float());
            }

            expect(seq1).not.toEqual(seq2);
        });
    });
});
