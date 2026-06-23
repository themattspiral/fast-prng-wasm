/**
 * PCG PRNG Tests
 *
 * Tests for PCG (Permuted Congruential Generator) PRNG implementation.
 *
 * Test Strategy:
 * - Verify determinism with larger sample sequences (vs integration's smaller samples)
 * - Test quality metrics (uniqueness, full range usage) on larger samples
 * - Validate all output formats (uint32, uint64, floats, coords) at WASM level
 * - Verify array methods match single-value sequences (stream consistency)
 * - Test stream selection via setStreamIncrement (PCG-specific feature)
 * - Statistical smoke tests (quartile distribution, Monte Carlo π)
 *
 * Note: PCG tests both uint32 (native) and uint64 (derived) comprehensively because
 * PCG's uint64 implementation chains two uint32 calls - this complexity warrants
 * thorough testing. Other generators only test their native output format.
 *
 * Contrast: These are deep WASM-level tests with larger sample sizes testing the raw
 * PRNG exports directly. Integration tests use smaller samples and test through the JS
 * wrapper to verify end-to-end wiring across all 5 generator types.
 */

import { describe, test, expect } from 'vitest-pool-assemblyscript/assembly';
import {
  setSeeds,
  setStreamIncrement,
  uint32,
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
  batchTestUnitCirclePoints
} from '../../prng/pcg';
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
  BIT_31,
  U32_Q1_MAX,
  U32_Q2_MAX,
  U32_Q3_MAX,
  MAX_SAFE_INTEGER,
  MAX_UINT32
} from '../helpers/test-utils';

/** Applies this suite's default seeds to establish a known generator state at the start of each test. */
function setupTest(): void {
  setSeeds(TEST_SEEDS.SINGLE);
}

describe('PCG', () => {
  describe('Determinism', () => {
    // NOTE: PCG tests both uint32 (native) and uint64 (derived) in Determinism and Quality
    // sections because PCG's uint64 is non-trivial - it chains two uint32 calls and advances
    // state twice. This complexity warrants thorough testing. In contrast, Xoroshiro/Xoshiro
    // generators only test their native uint64 output here because their uint32 is trivially
    // derived via a simple bit shift (uint64() >>> 32).

    test('uint32 produces identical sequence with same seed', () => {
      setupTest();

      const seq1: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        seq1.push(uint32());
      }

      setSeeds(TEST_SEEDS.SINGLE);
      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (uint32() != seq1[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 values should match with same seed
    });

    test('uint32 produces different values with different seed', () => {
      setupTest();

      const values1: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values1.push(uint32());
      }

      setSeeds(TEST_SEEDS_ALT.SINGLE);
      const values2: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values2.push(uint32());
      }

      // All values should differ
      let differentCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (values1[i] != values2[i]) {
          differentCount++;
        }
      }

      expect(differentCount).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values differ with different seed
    });

    test('uint64 produces identical sequence with same seed', () => {
      setupTest();

      const seq1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        seq1.push(uint64());
      }

      setSeeds(TEST_SEEDS.SINGLE);
      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (uint64() != seq1[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 values should match with same seed
    });

    test('uint64 produces different values with different seed', () => {
      setupTest();

      const values1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values1.push(uint64());
      }

      setSeeds(TEST_SEEDS_ALT.SINGLE);
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

      expect(differentCount).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values differ with different seed
    });
  });

  describe('Quality', () => {
    // NOTE: PCG tests both uint32 (native) and uint64 (derived) in Determinism and Quality
    // sections because PCG's uint64 is non-trivial - it chains two uint32 calls and advances
    // state twice. This complexity warrants thorough testing. In contrast, Xoroshiro/Xoshiro
    // generators only test their native uint64 output here because their uint32 is trivially
    // derived via a simple bit shift (uint64() >>> 32).

    test('uint32 should produce unique values', () => {
      setupTest();

      const values = new Set<u32>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values.add(uint32());
      }

      expect(values.size).toBe(DETERMINISTIC_SAMPLE_SIZE); // All 10000 values are unique
    });

    test('uint32 should use full range', () => {
      setupTest();

      let hasHighBit = false;
      let hasLowBit = false;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = uint32();
        if (val >= BIT_31) {
          hasHighBit = true;
        } else {
          hasLowBit = true;
        }

        if (hasHighBit && hasLowBit) break;
      }

      expect(hasHighBit).toBe(true); // Should produce values >= 2^31
      expect(hasLowBit).toBe(true); // Should produce values < 2^31
    });

    test('uint64 should produce unique values', () => {
      setupTest();

      const values = new Set<u64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values.add(uint64());
      }

      expect(values.size).toBe(DETERMINISTIC_SAMPLE_SIZE); // All 10000 values are unique
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

      setSeeds(TEST_SEEDS.SINGLE);
      const arr = new Uint64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint64Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 array values match single-call sequence
    });

    test('uint53AsFloatArray should match repeated uint53AsFloat calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(uint53AsFloat());
      }

      setSeeds(TEST_SEEDS.SINGLE);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint53AsFloatArray(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 array values match single-call sequence
    });

    test('uint32AsFloatArray should match repeated uint32AsFloat calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(uint32AsFloat());
      }

      setSeeds(TEST_SEEDS.SINGLE);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint32AsFloatArray(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 array values match single-call sequence
    });

    test('float53Array should match repeated float53 calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(float53());
      }

      setSeeds(TEST_SEEDS.SINGLE);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 array values match single-call sequence
    });

    test('coord53Array should match repeated coord53 calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(coord53());
      }

      setSeeds(TEST_SEEDS.SINGLE);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 array values match single-call sequence
    });

    test('coord53SquaredArray should match repeated coord53Squared calls', () => {
      setupTest();

      const singleValues: f64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        singleValues.push(coord53Squared());
      }

      setSeeds(TEST_SEEDS.SINGLE);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53SquaredArray(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0); // All 10000 array values match single-call sequence
    });

    test('float53Array should handle size 1', () => {
      setupTest();

      const expected = float53();

      setSeeds(TEST_SEEDS.SINGLE);
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
      expect(uniqueValues.size).toBe(DETERMINISTIC_SAMPLE_SIZE); // All 10000 values are unique
    });
  });

  describe('Stream Increment', () => {
    test('setStreamIncrement with setSeeds produces deterministic sequence', () => {
      setupTest();

      setStreamIncrement(5);
      setSeeds(TEST_SEEDS.SINGLE);
      const val1 = uint32();

      setStreamIncrement(5);
      setSeeds(TEST_SEEDS.SINGLE);
      const val2 = uint32();

      expect(val1).toBe(val2); // Same seed and increment produce same value
    });

    test('setStreamIncrement produces different sequence from default', () => {
      setupTest();

      // Default stream (no setStreamIncrement call)
      setSeeds(TEST_SEEDS.SINGLE);
      const defaultSeq: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        defaultSeq.push(uint32());
      }

      // Custom stream increment
      setStreamIncrement(2);
      setSeeds(TEST_SEEDS.SINGLE);
      const customSeq: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        customSeq.push(uint32());
      }

      // All values should differ (100% different per test standard for stream selection)
      let differentCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (defaultSeq[i] != customSeq[i]) {
          differentCount++;
        }
      }

      expect(differentCount).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values differ with different stream increment
    });

    test('different stream increments produce completely different sequences', () => {
      setupTest();

      // Stream increment 1
      setStreamIncrement(1);
      setSeeds(TEST_SEEDS.SINGLE);
      const seq1: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        seq1.push(uint32());
      }

      // Stream increment 2
      setStreamIncrement(2);
      setSeeds(TEST_SEEDS.SINGLE);
      const seq2: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        seq2.push(uint32());
      }

      // All values should differ (100% different per test standard for stream selection)
      let differentCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (seq1[i] != seq2[i]) {
          differentCount++;
        }
      }

      expect(differentCount).toBe(DETERMINISTIC_SAMPLE_SIZE); // All values differ with different stream increments
    });
  });

  describe('Statistical Smoke Tests', () => {
    test('uint32: basic distribution check (100K samples)', () => {
      setupTest();

      const q1Max: u32 = U32_Q1_MAX;
      const q2Max: u32 = U32_Q2_MAX;
      const q3Max: u32 = U32_Q3_MAX;

      let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

      for (let i = 0; i < DISTRIBUTION_SAMPLE_SIZE; i++) {
        const val = uint32();
        if (val <= q1Max) q1++;
        else if (val <= q2Max) q2++;
        else if (val <= q3Max) q3++;
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

      const total = DISTRIBUTION_SAMPLE_SIZE;
      const inside = batchTestUnitCirclePoints(total);

      expect(inside).toBeGreaterThanOrEqual(0); // Points inside circle in valid range [0, total]
      expect(inside).toBeLessThanOrEqual(total);

      const piEstimate = (4.0 * <f64>inside) / <f64>total;
      const diff = piEstimate > PI
        ? piEstimate - PI
        : PI - piEstimate;

      expect(diff).toBeLessThan(PI_ESTIMATE_TOLERANCE); // π estimation error: estimate within 0.02 of actual value
    });

    test('batchTestUnitCirclePoints: determinism', () => {
      setupTest();

      const result1 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      setSeeds(TEST_SEEDS.SINGLE);
      const result2 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      expect(result1).toBe(result2); // Monte Carlo results are deterministic with same seed
    });
  });
});
