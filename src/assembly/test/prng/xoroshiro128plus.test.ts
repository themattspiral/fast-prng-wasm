/**
 * Xoroshiro128Plus PRNG Tests
 *
 * Tests for Xoroshiro128+ (128-bit state, scalar) PRNG implementation.
 *
 * Test Strategy:
 * - Verify determinism with larger sample sequences (vs integration's smaller samples)
 * - Test quality metrics (uniqueness, full range usage) on larger samples
 * - Validate all output formats (uint64, floats, coords) at WASM level
 * - Verify array methods match single-value sequences (stream consistency)
 * - Test jump() for parallel stream generation with C reference validation
 * - Statistical smoke tests (quartile distribution, Monte Carlo π)
 *
 * Contrast: These are deep WASM-level tests with larger sample sizes testing the raw
 * PRNG exports directly. Integration tests use smaller samples and test through the JS
 * wrapper to verify end-to-end wiring across all 5 generator types.
 */

import { describe, test, expect } from 'vitest-pool-assemblyscript/assembly';
import {
  setSeeds,
  uint64,
  uint53AsFloat,
  uint32AsFloat,
  float53,
  coord53,
  coord53Squared,
  uint64Array,
  uint53AsFloatArray,
  uint32AsFloatArray,
  float53Array,
  coord53Array,
  coord53SquaredArray,
  batchTestUnitCirclePoints,
  jump
} from '../../prng/xoroshiro128plus';
import {
  TEST_SEEDS,
  TEST_SEEDS_ALT,
  DETERMINISTIC_SAMPLE_SIZE,
  DISTRIBUTION_SAMPLE_SIZE,
  QUARTILE_MIN,
  QUARTILE_MAX,
  PI_ESTIMATE_TOLERANCE,
  PI,
  BIT_63,
  U64_Q1_MAX,
  U64_Q2_MAX,
  U64_Q3_MAX,
  MAX_SAFE_INTEGER,
  MAX_UINT32,
  JUMP_REFERENCE
} from '../helpers/test-utils';

/** Applies this suite's default seeds to establish a known generator state at the start of each test. */
function setupTest(): void {
  setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
}

describe('Xoroshiro128Plus', () => {
  describe('Determinism', () => {
    test('uint64 produces identical sequence with same seeds', () => {
      setupTest();

      const seq1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        seq1.push(uint64());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (uint64() != seq1[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All values should match with same seeds
    });

    test('uint64 produces different values with different seeds', () => {
      setupTest();

      const values1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values1.push(uint64());
      }

      setSeeds(TEST_SEEDS_ALT.DOUBLE_0, TEST_SEEDS_ALT.DOUBLE_1);
      const values2: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values2.push(uint64());
      }

      // All values should differ
      let differentCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (values1[i] != values2[i]) {
          differentCount++;
        }
      }

      expect(differentCount).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values differ with different seeds
    });
  });

  describe('Quality', () => {
    test('uint64 should produce unique values', () => {
      setupTest();

      const values = new Set<u64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values.add(uint64());
      }

      expect(values.size).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values are unique
    });

    test('uint64 should use full range', () => {
      setupTest();

      let hasHighBit = false;
      let hasLowBit = false;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = uint64();
        if (val >= BIT_63) {
          hasHighBit = true;
        } else {
          hasLowBit = true;
        }

        if (hasHighBit && hasLowBit) break;
      }

      expect(hasHighBit).toBe(true); // Should produce values >= 2^63
      expect(hasLowBit).toBe(true); // Should produce values < 2^63
    });
  });

  describe('Range Validation', () => {
    test('uint53AsFloat should be in [0, 2^53-1]', () => {
      setupTest();

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = uint53AsFloat();
        if (val < 0) belowMin++;
        if (val > MAX_SAFE_INTEGER) aboveMax++;
      }

      expect(belowMin).toBe(0); // No values below 0
      expect(aboveMax).toBe(0); // No values above 2^53-1
    });

    test('uint32AsFloat should be in [0, 2^32-1]', () => {
      setupTest();

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = uint32AsFloat();
        if (val < 0) belowMin++;
        if (val > MAX_UINT32) aboveMax++;
      }

      expect(belowMin).toBe(0); // No values below 0
      expect(aboveMax).toBe(0); // No values above 2^32-1
    });

    test('float53 should be in [0, 1)', () => {
      setupTest();

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = float53();
        if (val < 0) belowMin++;
        if (val >= 1) aboveMax++;
      }

      expect(belowMin).toBe(0); // No values below 0
      expect(aboveMax).toBe(0); // No values >= 1
    });

    test('coord53 should be in [-1, 1)', () => {
      setupTest();

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = coord53();
        if (val < -1) belowMin++;
        if (val >= 1) aboveMax++;
      }

      expect(belowMin).toBe(0); // No values below -1
      expect(aboveMax).toBe(0); // No values >= 1
    });

    test('coord53Squared should be in [0, 1]', () => {
      setupTest();

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = coord53Squared();
        if (val < 0) belowMin++;
        if (val > 1) aboveMax++;
      }

      expect(belowMin).toBe(0); // No values below 0
      expect(aboveMax).toBe(0); // No values above 1 (inclusive upper bound)
    });
  });

  describe('Array Methods', () => {
    test('uint64Array should match repeated uint64 calls', () => {
      setupTest();

      const singleValues: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(uint64());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Uint64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint64Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All array values match single-call sequence
    });

    test('uint53AsFloatArray should match repeated uint53AsFloat calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(uint53AsFloat());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint53AsFloatArray(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All array values match single-call sequence
    });

    test('uint32AsFloatArray should match repeated uint32AsFloat calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(uint32AsFloat());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint32AsFloatArray(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All array values match single-call sequence
    });

    test('float53Array should match repeated float53 calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(float53());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All array values match single-call sequence
    });

    test('coord53Array should match repeated coord53 calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(coord53());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All array values match single-call sequence
    });

    test('coord53SquaredArray should match repeated coord53Squared calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(coord53Squared());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53SquaredArray(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All array values match single-call sequence
    });

    test('float53Array should handle size 1', () => {
      setupTest();

      const expected = float53();

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Float64Array(1);
      float53Array(arr);

      expect(arr[0]).toBe(expected); // Single-element array works correctly
    });

    test('float53Array should handle large arrays', () => {
      setupTest();

      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr);

      // Check diversity (all values should be unique)
      const uniqueValues = new Set<f64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        uniqueValues.add(arr[i]);
      }
      expect(uniqueValues.size).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values are unique
    });
  });

  describe('Jump Function', () => {
    test('jump advances state deterministically', () => {
      setupTest();

      jump();
      const val1 = uint64();

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      jump();
      const val2 = uint64();

      expect(val1).toBe(val2); // Jump produces same value with same initial seeds
    });

    test('jump produces different sequence', () => {
      setupTest();

      const beforeJump: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        beforeJump.push(uint64());
      }

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      jump();
      const afterJump: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        afterJump.push(uint64());
      }

      // All values should differ
      let differentCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (beforeJump[i] != afterJump[i]) {
          differentCount++;
        }
      }

      expect(differentCount).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values differ after jump
    });

    test('multiple jumps produce non-overlapping sequences', () => {
      setupTest();

      // Create 3 streams with 0, 1, and 2 jumps
      const stream0: u64[] = [];
      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        stream0.push(uint64());
      }

      const stream1: u64[] = [];
      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      jump();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        stream1.push(uint64());
      }

      const stream2: u64[] = [];
      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      jump();
      jump();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        stream2.push(uint64());
      }

      const set0 = new Set<u64>();
      const set1 = new Set<u64>();
      const set2 = new Set<u64>();

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        set0.add(stream0[i]);
        set1.add(stream1[i]);
        set2.add(stream2[i]);
      }

      // Count overlaps by checking if values from one stream exist in another stream's set
      let overlap_0_1 = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (set1.has(stream0[i])) {
          overlap_0_1++;
        }
      }

      let overlap_1_2 = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (set2.has(stream1[i])) {
          overlap_1_2++;
        }
      }

      let overlap_0_2 = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (set2.has(stream0[i])) {
          overlap_0_2++;
        }
      }

      // With proper jump, there should be no overlaps
      expect(overlap_0_1).toBe(0); // Stream 0 and 1 should not overlap
      expect(overlap_1_2).toBe(0); // Stream 1 and 2 should not overlap
      expect(overlap_0_2).toBe(0); // Stream 0 and 2 should not overlap
    });

    test('jump matches C reference implementation', () => {
      setupTest();

      // Reference value from the official C implementation at:
      // https://prng.di.unimi.it/xoroshiro128plus.c
      //
      // With TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1, after calling jump(),
      // the first call to next() should return the reference value.
      //
      // This value is verified by src/assembly/test/c-reference/validate-jump.c
      // to ensure our implementation matches the official reference exactly.

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      jump();
      const result = uint64();

      expect(result).toBe(JUMP_REFERENCE.XOROSHIRO128PLUS); // Must match C reference implementation
    });
  });

  describe('Statistical Smoke Tests', () => {
    test('uint64: basic distribution check (100K samples)', () => {
      setupTest();

      let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

      for (let i = 0; i < DISTRIBUTION_SAMPLE_SIZE; i++) {
        const val = uint64();
        if (val <= U64_Q1_MAX) q1++;
        else if (val <= U64_Q2_MAX) q2++;
        else if (val <= U64_Q3_MAX) q3++;
        else q4++;
      }

      // Expect roughly 25K in each quartile (allow 24K-26K)
      expect(q1).toBeGreaterThanOrEqual(QUARTILE_MIN); // Q1 quartile in range [QUARTILE_MIN, QUARTILE_MAX]
      expect(q1).toBeLessThanOrEqual(QUARTILE_MAX);
      expect(q2).toBeGreaterThanOrEqual(QUARTILE_MIN); // Q2 quartile in range [QUARTILE_MIN, QUARTILE_MAX]
      expect(q2).toBeLessThanOrEqual(QUARTILE_MAX);
      expect(q3).toBeGreaterThanOrEqual(QUARTILE_MIN); // Q3 quartile in range [QUARTILE_MIN, QUARTILE_MAX]
      expect(q3).toBeLessThanOrEqual(QUARTILE_MAX);
      expect(q4).toBeGreaterThanOrEqual(QUARTILE_MIN); // Q4 quartile in range [QUARTILE_MIN, QUARTILE_MAX]
      expect(q4).toBeLessThanOrEqual(QUARTILE_MAX);
    });

    test('Monte Carlo π estimation (100K samples)', () => {
      setupTest();

      const inside = batchTestUnitCirclePoints(DISTRIBUTION_SAMPLE_SIZE);

      expect(inside).toBeGreaterThanOrEqual(0); // Points inside circle in valid range [0, DISTRIBUTION_SAMPLE_SIZE]
      expect(inside).toBeLessThanOrEqual(DISTRIBUTION_SAMPLE_SIZE);

      const piEstimate = (4.0 * <f64>inside) / <f64>DISTRIBUTION_SAMPLE_SIZE;
      const diff = piEstimate > PI
        ? piEstimate - PI
        : PI - piEstimate;

      expect(diff).toBeLessThan(PI_ESTIMATE_TOLERANCE); // π estimation error
    });

    test('batchTestUnitCirclePoints: determinism', () => {
      setupTest();

      const result1 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const result2 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      expect(result1).toBe(result2); // Monte Carlo results are deterministic with same seeds
    });
  });
});
