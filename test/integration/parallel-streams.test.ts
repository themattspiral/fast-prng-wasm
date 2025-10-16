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
import { createParallelGenerators, TEST_SEEDS, JUMP_REFERENCE, INTEGRATION_SAMPLE_SIZE } from '../helpers/test-utils';

describe('RandomGenerator Parallel Generator Stream Selection', () => {
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

        // With proper stream selection, there should be no overlaps
        expect(overlap_1_2).toBe(0); // Streams should not overlap
        expect(overlap_1_3).toBe(0);
        expect(overlap_2_3).toBe(0);
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

        // With proper stream selection, there should be no overlaps
        expect(overlap_1_2).toBe(0); // Streams should not overlap
        expect(overlap_1_3).toBe(0);
        expect(overlap_2_3).toBe(0);
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

        // With proper stream selection, there should be no overlaps
        expect(overlap_1_2).toBe(0); // SIMD streams (both lanes) should not overlap
        expect(overlap_1_3).toBe(0);
        expect(overlap_2_3).toBe(0);
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

        // With proper stream selection, there should be no overlaps
        expect(overlap_1_2).toBe(0); // SIMD streams (both lanes) should not overlap
        expect(overlap_1_3).toBe(0);
        expect(overlap_2_3).toBe(0);
    });

    it('should create PCG generators with different stream increments that produce non-overlapping sequences', () => {
        // PCG uses setStreamIncrement instead of jump() for stream selection
        const numGenerators = 3;
        const [gen1, gen2, gen3] = createParallelGenerators(numGenerators, PRNGType.PCG, TEST_SEEDS.single);

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

        // With proper stream selection, there should be no overlaps
        expect(overlap_1_2).toBe(0); // Streams should not overlap
        expect(overlap_1_3).toBe(0);
        expect(overlap_2_3).toBe(0);
    });
});
