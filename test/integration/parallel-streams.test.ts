/**
 * RandomGenerator Parallel Generator Stream Selection Tests
 *
 * Tests for stream selection via jump() function (Xoroshiro/Xoshiro) or
 * setStreamIncrement() (PCG), verifying parallel generators produce
 * non-overlapping sequences.
 *
 * Test Strategy:
 * - Create 3 parallel generators with same seeds but different stream IDs
 * - Verify first values match C reference implementation (jump correctness)
 * - Point-level check: values at same index differ across all streams (100%)
 * - Sequence-level check: no value from one stream appears in any other stream
 * - Test both non-SIMD and SIMD variants (SIMD must verify both lanes)
 *
 * Contrast: This file tests stream independence via unique stream IDs (designed
 * for parallel use cases where streams must never overlap). For independent state
 * management across multiple instances (which can share seeds but maintain separate
 * internal state), see independence.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { createParallelGenerators, TEST_SEEDS, JUMP_REFERENCE, INTEGRATION_SAMPLE_SIZE, PARALLEL_GENERATOR_COUNT } from '../helpers/test-utils';

/**
 * Validates stream independence for parallel generators.
 *
 * Tests that multiple generators with the same seeds but different stream IDs
 * produce completely non-overlapping sequences:
 * - Point-level: values at same position differ 100% across all streams
 * - Sequence-level: no value from one stream appears anywhere in other streams
 *
 * @param generators Array of 3 parallel generators to test
 * @param expectedFirstValues Optional C reference values to validate (1 value for non-SIMD, 2 for SIMD lanes)
 */
function validateStreamIndependence(
    generators: [RandomGenerator, RandomGenerator, RandomGenerator],
    expectedFirstValues?: number[]
): void {
    const [gen1, gen2, gen3] = generators;

    // Use array methods for all generators (works for both SIMD and non-SIMD)
    const seq1 = Array.from(gen1.floatArray());
    const seq2 = Array.from(gen2.floatArray());
    const seq3 = Array.from(gen3.floatArray());

    // Validate first values against C reference (if provided)
    if (expectedFirstValues) {
        expect(seq1[0]).toBe(expectedFirstValues[0]);
        if (expectedFirstValues.length > 1) {
            expect(seq1[1]).toBe(expectedFirstValues[1]); // SIMD lane 1
        }
    }

    const sampleSize = seq1.length;

    // Point-level check: values at same position should differ (100% different per stream selection standard)
    let diff12 = 0, diff13 = 0, diff23 = 0;
    for (let i = 0; i < sampleSize; i++) {
        if (seq1[i] !== seq2[i]) diff12++;
        if (seq1[i] !== seq3[i]) diff13++;
        if (seq2[i] !== seq3[i]) diff23++;
    }

    expect(diff12).toBe(sampleSize); // All values at corresponding positions differ
    expect(diff13).toBe(sampleSize);
    expect(diff23).toBe(sampleSize);

    // Sequence-level check: no value from one stream should appear anywhere in other streams
    const set2 = new Set(seq2);
    const set3 = new Set(seq3);

    let overlap_1_2 = 0;
    let overlap_1_3 = 0;
    let overlap_2_3 = 0;

    for (let i = 0; i < sampleSize; i++) {
        if (set2.has(seq1[i])) overlap_1_2++;
        if (set3.has(seq1[i])) overlap_1_3++;
        if (set3.has(seq2[i])) overlap_2_3++;
    }

    // With proper stream selection, there should be no overlaps
    expect(overlap_1_2).toBe(0); // Streams should not overlap
    expect(overlap_1_3).toBe(0);
    expect(overlap_2_3).toBe(0);
}

describe('RandomGenerator Parallel Generator Stream Selection', () => {
    // Configuration for each algorithm's stream selection testing
    const streamSelectionConfig = [
        { algo: PRNGType.PCG, seeds: TEST_SEEDS.single, references: undefined },
        { algo: PRNGType.Xoroshiro128Plus, seeds: TEST_SEEDS.double, references: [JUMP_REFERENCE.XOROSHIRO128PLUS] },
        { algo: PRNGType.Xoroshiro128Plus_SIMD, seeds: TEST_SEEDS.quad, references: [JUMP_REFERENCE.XOROSHIRO128PLUS, JUMP_REFERENCE.XOROSHIRO128PLUS_SIMD_LANE1] },
        { algo: PRNGType.Xoshiro256Plus, seeds: TEST_SEEDS.quad, references: [JUMP_REFERENCE.XOSHIRO256PLUS] },
        { algo: PRNGType.Xoshiro256Plus_SIMD, seeds: TEST_SEEDS.octet, references: [JUMP_REFERENCE.XOSHIRO256PLUS, JUMP_REFERENCE.XOSHIRO256PLUS_SIMD_LANE1] }
    ];

    streamSelectionConfig.forEach(({ algo, seeds, references }) => {
        describe(`${PRNGType[algo]}`, () => {
            it('should produce non-overlapping sequences with unique stream IDs', () => {
                const generators = createParallelGenerators(PARALLEL_GENERATOR_COUNT, algo, seeds) as [RandomGenerator, RandomGenerator, RandomGenerator];
                validateStreamIndependence(generators, references);
            });
        });
    });
});
