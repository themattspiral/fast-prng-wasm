/**
 * Xoroshiro128Plus SIMD PRNG Tests
 *
 * Tests for Xoroshiro128+ SIMD (dual-lane parallel 128-bit state) PRNG implementation.
 *
 * Test Strategy:
 * - Verify determinism with larger sample sequences (vs integration's smaller samples)
 * - Test quality metrics (uniqueness, full range usage) on larger samples
 * - Validate all output formats (uint64, floats, coords) at WASM level for both lanes
 * - Verify SIMD-specific behavior: dual-lane independence and interleaving
 * - Test jump() for parallel stream generation with C reference validation
 * - Validate array methods interleave dual-lane output correctly
 * - Statistical smoke tests (quartile distribution, Monte Carlo π)
 *
 * Contrast: These are deep WASM-level SIMD tests with larger sample sizes testing the raw
 * PRNG exports directly. Integration tests use smaller samples and test through the JS wrapper
 * to verify end-to-end wiring across all 5 generator types.
 */

import { describe, test, expect, beforeEach } from 'assemblyscript-unittest-framework/assembly';
import {
  setSeeds,
  uint64,
  uint64x2,
  uint53AsFloat,
  uint53AsFloatx2,
  uint32AsFloat,
  uint32AsFloatx2,
  float53,
  float53x2,
  coord53,
  coord53x2,
  coord53Squared,
  coord53Squaredx2,
  uint64Array,
  uint53AsFloatArray,
  uint32AsFloatArray,
  float53Array,
  coord53Array,
  coord53SquaredArray,
  batchTestUnitCirclePoints,
  jump
} from '../../prng/xoroshiro128plus-simd';

// Import non-SIMD functions for comparison tests
import {
  setSeeds as setSeedsNonSIMD,
  float53Array as float53ArrayNonSIMD
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
import { assertInRange, assertLessThan } from '../helpers/assertion-helpers';

describe('Xoroshiro128PlusSIMD', () => {
  beforeEach(() => {
    setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
  });

  describe('Determinism', () => {
    test('uint64 produces identical sequence with same seeds', () => {
      const seq1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        seq1.push(uint64());
      }

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (uint64() != seq1[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All values should match with same seeds
    });

    test('uint64 produces different values with different seeds', () => {
      const values1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values1.push(uint64());
      }

      setSeeds(TEST_SEEDS_ALT.QUAD_0, TEST_SEEDS_ALT.QUAD_1, TEST_SEEDS_ALT.QUAD_2, TEST_SEEDS_ALT.QUAD_3);
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

      expect(differentCount).equal(DETERMINISTIC_SAMPLE_SIZE); // All values differ with different seeds
    });
  });

  describe('Quality', () => {
    test('uint64 should produce unique values', () => {
      const values = new Set<u64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values.add(uint64());
      }

      expect(values.size == DETERMINISTIC_SAMPLE_SIZE).equal(true); // All values are unique
    });

    test('uint64 should use full range', () => {
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

      expect(hasHighBit).equal(true); // Should produce values >= 2^63
      expect(hasLowBit).equal(true); // Should produce values < 2^63
    });
  });

  describe('Range Validation', () => {
    test('uint53AsFloat should be in [0, 2^53-1]', () => {
      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = uint53AsFloat();
        if (val < 0) belowMin++;
        if (val > MAX_SAFE_INTEGER) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below 0
      expect(aboveMax).equal(0); // No values above 2^53-1
    });

    test('uint32AsFloat should be in [0, 2^32-1]', () => {
      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = uint32AsFloat();
        if (val < 0) belowMin++;
        if (val > MAX_UINT32) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below 0
      expect(aboveMax).equal(0); // No values above 2^32-1
    });

    test('float53 should be in [0, 1)', () => {
      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = float53();
        if (val < 0) belowMin++;
        if (val >= 1) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below 0
      expect(aboveMax).equal(0); // No values >= 1
    });

    test('coord53 should be in [-1, 1)', () => {
      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = coord53();
        if (val < -1) belowMin++;
        if (val >= 1) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below -1
      expect(aboveMax).equal(0); // No values >= 1
    });

    test('coord53Squared should be in [0, 1]', () => {
      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const val = coord53Squared();
        if (val < 0) belowMin++;
        if (val > 1) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below 0
      expect(aboveMax).equal(0); // No values above 1 (inclusive upper bound)
    });
  });

  describe('Array Methods', () => {
    // NOTE: SIMD array methods process 2 values at a time using uint64x2() internally,
    // so they do NOT match repeated single-value uint64() calls (which discard lane 1).
    // Instead, we test determinism and value quality.

    test('uint64Array produces deterministic sequences', () => {
      const arr1 = new Uint64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint64Array(arr1);

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      const arr2 = new Uint64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint64Array(arr2);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr1[i] != arr2[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All array values are deterministic with same seeds
    });

    test('uint53AsFloatArray produces deterministic sequences', () => {
      const arr1 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint53AsFloatArray(arr1);

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      const arr2 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint53AsFloatArray(arr2);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr1[i] != arr2[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All array values are deterministic with same seeds
    });

    test('uint53AsFloatArray values are in correct range', () => {
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint53AsFloatArray(arr);

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] < 0) belowMin++;
        if (arr[i] > MAX_SAFE_INTEGER) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below 0
      expect(aboveMax).equal(0); // No values above 2^53-1
    });

    test('uint32AsFloatArray produces deterministic sequences', () => {
      const arr1 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint32AsFloatArray(arr1);

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      const arr2 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint32AsFloatArray(arr2);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr1[i] != arr2[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All array values are deterministic with same seeds
    });

    test('uint32AsFloatArray values are in correct range', () => {
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint32AsFloatArray(arr);

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] < 0) belowMin++;
        if (arr[i] > MAX_UINT32) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below 0
      expect(aboveMax).equal(0); // No values above 2^32-1
    });

    test('float53Array produces deterministic sequences', () => {
      const arr1 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr1);

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      const arr2 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr2);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr1[i] != arr2[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All array values are deterministic with same seeds
    });

    test('float53Array should handle large arrays', () => {
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr);

      // Check diversity (all values should be unique)
      const uniqueValues = new Set<f64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        uniqueValues.add(arr[i]);
      }
      expect(uniqueValues.size).equal(DETERMINISTIC_SAMPLE_SIZE); // All values are unique
    });

    test('coord53Array values are in correct range', () => {
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53Array(arr);

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] < -1) belowMin++;
        if (arr[i] >= 1) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below -1
      expect(aboveMax).equal(0); // No values >= 1
    });

    test('coord53SquaredArray produces deterministic sequences', () => {
      const arr1 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53SquaredArray(arr1);

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      const arr2 = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53SquaredArray(arr2);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr1[i] != arr2[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All array values are deterministic with same seeds
    });

    test('coord53SquaredArray values are in correct range', () => {
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      coord53SquaredArray(arr);

      let belowMin = 0;
      let aboveMax = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] < 0) belowMin++;
        if (arr[i] > 1) aboveMax++;
      }

      expect(belowMin).equal(0); // No values below 0
      expect(aboveMax).equal(0); // No values above 1 (inclusive upper bound)
    });
  });

  describe('Jump Function', () => {
    test('jump advances state deterministically', () => {
      jump();
      const val1 = uint64();

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      jump();
      const val2 = uint64();

      expect(val1).equal(val2); // Jump produces same value with same initial seeds
    });

    test('jump produces different sequence', () => {
      const beforeJump: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        beforeJump.push(uint64());
      }

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
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

      expect(differentCount).equal(DETERMINISTIC_SAMPLE_SIZE); // All values differ after jump
    });

    test('multiple jumps produce non-overlapping sequences', () => {
      // Create 3 streams with 0, 1, and 2 jumps to validate the parallel computation guarantee
      const stream0: u64[] = [];
      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        stream0.push(uint64());
      }

      const stream1: u64[] = [];
      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      jump();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        stream1.push(uint64());
      }

      const stream2: u64[] = [];
      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
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
      expect(overlap_0_1).equal(0); // Stream 0 and 1 should not overlap
      expect(overlap_1_2).equal(0); // Stream 1 and 2 should not overlap
      expect(overlap_0_2).equal(0); // Stream 0 and 2 should not overlap
    });

    test('jump matches C reference implementation', () => {
      // Reference value from the official C implementation at:
      // https://prng.di.unimi.it/xoroshiro128plus.c
      //
      // With TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1, after calling jump(),
      // the first call to next() should return the reference value.
      //
      // This value is verified by src/assembly/test/c-reference/validate-jump.c
      // to ensure our implementation matches the official reference exactly.

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1, TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      jump();
      const result = uint64();

      expect(result).equal(JUMP_REFERENCE.XOROSHIRO128PLUS); // Must match C reference implementation
    });
  });

  describe('Statistical Smoke Tests', () => {
    test('uint64: basic distribution check (100K samples)', () => {
      let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

      for (let i = 0; i < DISTRIBUTION_SAMPLE_SIZE; i++) {
        const val = uint64();
        if (val <= U64_Q1_MAX) q1++;
        else if (val <= U64_Q2_MAX) q2++;
        else if (val <= U64_Q3_MAX) q3++;
        else q4++;
      }

      // Expect roughly 25K in each quartile (allow 24K-26K)
      assertInRange(q1, QUARTILE_MIN, QUARTILE_MAX, "Q1 quartile"); // Q1 has ~25K values
      assertInRange(q2, QUARTILE_MIN, QUARTILE_MAX, "Q2 quartile"); // Q2 has ~25K values
      assertInRange(q3, QUARTILE_MIN, QUARTILE_MAX, "Q3 quartile"); // Q3 has ~25K values
      assertInRange(q4, QUARTILE_MIN, QUARTILE_MAX, "Q4 quartile"); // Q4 has ~25K values
    });

    test('Monte Carlo π estimation (100K samples)', () => {
      const inside = batchTestUnitCirclePoints(DISTRIBUTION_SAMPLE_SIZE);

      assertInRange(inside, 0, DISTRIBUTION_SAMPLE_SIZE, "Points inside circle"); // Count should be in valid range

      const piEstimate = (4.0 * <f64>inside) / <f64>DISTRIBUTION_SAMPLE_SIZE;
      const diff = piEstimate > PI
        ? piEstimate - PI
        : PI - piEstimate;

      assertLessThan(diff, PI_ESTIMATE_TOLERANCE, "π estimation error"); // π estimate within tolerance of actual value
    });

    test('batchTestUnitCirclePoints: determinism', () => {
      const result1 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      const result2 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      expect(result1).equal(result2); // Monte Carlo results are deterministic with same seeds
    });
  });

  describe('SIMD-Specific Tests', () => {
    test('uint64x2 produces independent non-zero values in both lanes', () => {
      const lane0_values: u64[] = [];
      const lane1_values: u64[] = [];
      let zeroCountLane0 = 0;
      let zeroCountLane1 = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const vec = uint64x2();
        const lane0 = v128.extract_lane<u64>(vec, 0);
        const lane1 = v128.extract_lane<u64>(vec, 1);

        lane0_values.push(lane0);
        lane1_values.push(lane1);

        if (lane0 == 0) zeroCountLane0++;
        if (lane1 == 0) zeroCountLane1++;
      }

      // Check for sequence-level overlap between lanes
      const set_lane0 = new Set<u64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        set_lane0.add(lane0_values[i]);
      }

      let overlap_count = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (set_lane0.has(lane1_values[i])) {
          overlap_count++;
        }
      }

      expect(overlap_count).equal(0); // Lanes should have no overlap across full sequences
      expect(zeroCountLane0).equal(0); // Lane 0: no zero values
      expect(zeroCountLane1).equal(0); // Lane 1: no zero values
    });

    test('SIMD lanes remain non-overlapping after jump()', () => {
      // Test that after jumping, the two lanes still don't overlap with each other
      const lane0_jump: u64[] = [];
      const lane1_jump: u64[] = [];

      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      jump();

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const vec = uint64x2();
        lane0_jump.push(v128.extract_lane<u64>(vec, 0));
        lane1_jump.push(v128.extract_lane<u64>(vec, 1));
      }

      const set_lane0 = new Set<u64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        set_lane0.add(lane0_jump[i]);
      }

      let overlap_count = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (set_lane0.has(lane1_jump[i])) {
          overlap_count++;
        }
      }

      expect(overlap_count).equal(0); // Lanes should remain non-overlapping after jump
    });

    test('SIMD lanes with different jump counts remain non-overlapping', () => {
      // Cross-lane, cross-jump test: Lane 0 with 0 jumps vs Lane 1 with 1 jump
      const lane0_no_jump: u64[] = [];
      const lane1_one_jump: u64[] = [];

      // Get Lane 0 with no jumps
      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        lane0_no_jump.push(v128.extract_lane<u64>(uint64x2(), 0));
      }

      // Get Lane 1 with one jump
      setSeeds(TEST_SEEDS.QUAD_0, TEST_SEEDS.QUAD_1, TEST_SEEDS.QUAD_2, TEST_SEEDS.QUAD_3);
      jump();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        lane1_one_jump.push(v128.extract_lane<u64>(uint64x2(), 1));
      }

      const set_lane0 = new Set<u64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        set_lane0.add(lane0_no_jump[i]);
      }

      let overlap_count = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (set_lane0.has(lane1_one_jump[i])) {
          overlap_count++;
        }
      }

      expect(overlap_count).equal(0); // Cross-lane, cross-jump sequences should not overlap
    });

    test('uint53AsFloatx2 produces valid values', () => {
      let belowMinLane0 = 0;
      let aboveMaxLane0 = 0;
      let belowMinLane1 = 0;
      let aboveMaxLane1 = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const vec = uint53AsFloatx2();
        const lane0 = v128.extract_lane<f64>(vec, 0);
        const lane1 = v128.extract_lane<f64>(vec, 1);

        if (lane0 < 0) belowMinLane0++;
        if (lane0 > MAX_SAFE_INTEGER) aboveMaxLane0++;
        if (lane1 < 0) belowMinLane1++;
        if (lane1 > MAX_SAFE_INTEGER) aboveMaxLane1++;
      }

      expect(belowMinLane0).equal(0); // Lane 0: no values below 0
      expect(aboveMaxLane0).equal(0); // Lane 0: no values above 2^53-1
      expect(belowMinLane1).equal(0); // Lane 1: no values below 0
      expect(aboveMaxLane1).equal(0); // Lane 1: no values above 2^53-1
    });

    test('uint32AsFloatx2 produces valid values', () => {
      let belowMinLane0 = 0;
      let aboveMaxLane0 = 0;
      let belowMinLane1 = 0;
      let aboveMaxLane1 = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const vec = uint32AsFloatx2();
        const lane0 = v128.extract_lane<f64>(vec, 0);
        const lane1 = v128.extract_lane<f64>(vec, 1);

        if (lane0 < 0) belowMinLane0++;
        if (lane0 > MAX_UINT32) aboveMaxLane0++;
        if (lane1 < 0) belowMinLane1++;
        if (lane1 > MAX_UINT32) aboveMaxLane1++;
      }

      expect(belowMinLane0).equal(0); // Lane 0: no values below 0
      expect(aboveMaxLane0).equal(0); // Lane 0: no values above 2^32-1
      expect(belowMinLane1).equal(0); // Lane 1: no values below 0
      expect(aboveMaxLane1).equal(0); // Lane 1: no values above 2^32-1
    });

    test('float53x2 produces values in correct range', () => {
      let belowMinLane0 = 0;
      let aboveMaxLane0 = 0;
      let belowMinLane1 = 0;
      let aboveMaxLane1 = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const vec = float53x2();
        const lane0 = v128.extract_lane<f64>(vec, 0);
        const lane1 = v128.extract_lane<f64>(vec, 1);

        if (lane0 < 0) belowMinLane0++;
        if (lane0 >= 1) aboveMaxLane0++;
        if (lane1 < 0) belowMinLane1++;
        if (lane1 >= 1) aboveMaxLane1++;
      }

      expect(belowMinLane0).equal(0); // Lane 0: no values below 0
      expect(aboveMaxLane0).equal(0); // Lane 0: no values >= 1
      expect(belowMinLane1).equal(0); // Lane 1: no values below 0
      expect(aboveMaxLane1).equal(0); // Lane 1: no values >= 1
    });

    test('coord53x2 produces values in correct range', () => {
      let belowMinLane0 = 0;
      let aboveMaxLane0 = 0;
      let belowMinLane1 = 0;
      let aboveMaxLane1 = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const vec = coord53x2();
        const lane0 = v128.extract_lane<f64>(vec, 0);
        const lane1 = v128.extract_lane<f64>(vec, 1);

        if (lane0 < -1) belowMinLane0++;
        if (lane0 >= 1) aboveMaxLane0++;
        if (lane1 < -1) belowMinLane1++;
        if (lane1 >= 1) aboveMaxLane1++;
      }

      expect(belowMinLane0).equal(0); // Lane 0: no values below -1
      expect(aboveMaxLane0).equal(0); // Lane 0: no values >= 1
      expect(belowMinLane1).equal(0); // Lane 1: no values below -1
      expect(aboveMaxLane1).equal(0); // Lane 1: no values >= 1
    });

    test('coord53Squaredx2 produces values in correct range', () => {
      let belowMinLane0 = 0;
      let aboveMaxLane0 = 0;
      let belowMinLane1 = 0;
      let aboveMaxLane1 = 0;

      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        const vec = coord53Squaredx2();
        const lane0 = v128.extract_lane<f64>(vec, 0);
        const lane1 = v128.extract_lane<f64>(vec, 1);

        if (lane0 < 0) belowMinLane0++;
        if (lane0 > 1) aboveMaxLane0++;
        if (lane1 < 0) belowMinLane1++;
        if (lane1 > 1) aboveMaxLane1++;
      }

      expect(belowMinLane0).equal(0); // Lane 0: no values below 0
      expect(aboveMaxLane0).equal(0); // Lane 0: no values > 1
      expect(belowMinLane1).equal(0); // Lane 1: no values below 0
      expect(aboveMaxLane1).equal(0); // Lane 1: no values > 1
    });

    test('array methods work with even-sized arrays', () => {
      const evenArr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(evenArr);

      let allNonZero = true;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (evenArr[i] == 0) {
          allNonZero = false;
          break;
        }
      }

      expect(allNonZero).equal(true); // Even-sized array fills correctly
    });

    test('interleaved identical streams with duplicated seeds', () => {
      // When seeds are [a, b, a, b], SIMD creates two identical parallel streams
      // This tests that lane 0 and lane 1 produce the same sequence when seeded identically
      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1, TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);

      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < <i32>(DETERMINISTIC_SAMPLE_SIZE / 2); i++) {
        // Even indices (lane 0) should equal odd indices (lane 1)
        if (arr[i * 2] != arr[i * 2 + 1]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All pairs match when seeds are duplicated
    });

    test('interleaved different streams when lanes have different seeds', () => {
      // Lane 0: TEST_SEEDS.DOUBLE_0/1, Lane 1: TEST_SEEDS_ALT.DOUBLE_0/1
      // This tests that when using different seeds for each lane, lane0 differs from lane1
      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1, TEST_SEEDS_ALT.DOUBLE_0, TEST_SEEDS_ALT.DOUBLE_1);
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr);

      // Even indices (lane 0) should differ from odd indices (lane 1)
      let differentCount = 0;
      for (let i = 0; i < <i32>(DETERMINISTIC_SAMPLE_SIZE / 2); i++) {
        if (arr[i * 2] != arr[i * 2 + 1]) {
          differentCount++;
        }
      }

      // All lane0/lane1 pairs should differ
      expect(differentCount).equal(<i32>(DETERMINISTIC_SAMPLE_SIZE / 2)); // All pairs differ when lanes have different seeds
    });

    test('interleaved matching streams: both lanes match their own non-SIMD sequences', () => {
      // Generate non-SIMD sequence for lane 0 with seeds [TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1]
      setSeedsNonSIMD(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const nonSIMDArr0 = new Float64Array(<i32>(DETERMINISTIC_SAMPLE_SIZE / 2));
      float53ArrayNonSIMD(nonSIMDArr0);

      // Generate non-SIMD sequence for lane 1 with seeds [TEST_SEEDS_ALT.DOUBLE_0, TEST_SEEDS_ALT.DOUBLE_1]
      setSeedsNonSIMD(TEST_SEEDS_ALT.DOUBLE_0, TEST_SEEDS_ALT.DOUBLE_1);
      const nonSIMDArr1 = new Float64Array(<i32>(DETERMINISTIC_SAMPLE_SIZE / 2));
      float53ArrayNonSIMD(nonSIMDArr1);

      // Generate SIMD sequence with lane 0 = [TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1], lane 1 = [TEST_SEEDS_ALT.DOUBLE_0, TEST_SEEDS_ALT.DOUBLE_1]
      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1, TEST_SEEDS_ALT.DOUBLE_0, TEST_SEEDS_ALT.DOUBLE_1);
      const simdArr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(simdArr);

      let lane0MismatchCount = 0;
      let lane1MismatchCount = 0;

      for (let i = 0; i < <i32>(DETERMINISTIC_SAMPLE_SIZE / 2); i++) {
        const lane0Val = simdArr[i * 2];
        const lane1Val = simdArr[i * 2 + 1];

        // Lane 0 should match first non-SIMD sequence
        if (lane0Val != nonSIMDArr0[i]) {
          lane0MismatchCount++;
        }

        // Lane 1 should match second non-SIMD sequence
        if (lane1Val != nonSIMDArr1[i]) {
          lane1MismatchCount++;
        }
      }

      expect(lane0MismatchCount).equal(0); // All lane 0 values match non-SIMD primary seed sequence
      expect(lane1MismatchCount).equal(0); // All lane 1 values match non-SIMD alternate seed sequence
    });
  });
});
