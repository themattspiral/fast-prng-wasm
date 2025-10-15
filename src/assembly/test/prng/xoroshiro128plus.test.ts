import { describe, test, expect, beforeEach } from 'assemblyscript-unittest-framework/assembly';
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
  jump,
  SEED_COUNT
} from '../../prng/xoroshiro128plus';
import {
  TEST_SEEDS,
  TEST_SEEDS_ALT,
  DETERMINISTIC_SAMPLE_SIZE,
  DISTRIBUTION_SAMPLE_SIZE,
  DIFFERENT_SEEDS_MIN_PERCENT,
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
} from '../test-utils';

describe('Xoroshiro128Plus', () => {
  beforeEach(() => {
    setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
  });

  describe('Determinism', () => {
    test('uint64 produces identical sequence with same seeds', () => {
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

      expect(mismatchCount).equal(0); // All values should match with same seeds
    });

    test('uint64 produces different values with different seeds', () => {
      const values1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values1.push(uint64());
      }

      setSeeds(TEST_SEEDS_ALT.DOUBLE_0, TEST_SEEDS_ALT.DOUBLE_1);
      const values2: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values2.push(uint64());
      }

      // At least 99% should differ
      let differentCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (values1[i] != values2[i]) {
          differentCount++;
        }
      }

      expect(differentCount >= <i32>(DETERMINISTIC_SAMPLE_SIZE * DIFFERENT_SEEDS_MIN_PERCENT)).equal(true); // At least 99% of values differ with different seeds
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
    test('uint64Array should match repeated uint64 calls', () => {
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

      expect(mismatchCount).equal(0); // All array values match single-call sequence
    });

    test('uint53AsFloatArray should match repeated uint53AsFloat calls', () => {
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

      expect(mismatchCount).equal(0); // All array values match single-call sequence
    });

    test('uint32AsFloatArray should match repeated uint32AsFloat calls', () => {
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

      expect(mismatchCount).equal(0); // All array values match single-call sequence
    });

    test('float53Array should match repeated float53 calls', () => {
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

      expect(mismatchCount).equal(0); // All array values match single-call sequence
    });

    test('coord53Array should match repeated coord53 calls', () => {
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

      expect(mismatchCount).equal(0); // All array values match single-call sequence
    });

    test('coord53SquaredArray should match repeated coord53Squared calls', () => {
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

      expect(mismatchCount).equal(0); // All array values match single-call sequence
    });

    test('float53Array should handle size 1', () => {
      const expected = float53();

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const arr = new Float64Array(1);
      float53Array(arr);

      expect(arr[0]).equal(expected); // Single-element array works correctly
    });

    test('float53Array should handle large arrays', () => {
      const arr = new Float64Array(DETERMINISTIC_SAMPLE_SIZE);
      float53Array(arr);

      // Check diversity (all values should be unique)
      const uniqueValues = new Set<f64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        uniqueValues.add(arr[i]);
      }
      expect(uniqueValues.size == DETERMINISTIC_SAMPLE_SIZE).equal(true); // All values are unique
    });
  });

  describe('Jump Function', () => {
    test('jump advances state deterministically', () => {
      jump();
      const val1 = uint64();

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      jump();
      const val2 = uint64();

      expect(val1).equal(val2); // Jump produces same value with same initial seeds
    });

    test('jump produces different sequence', () => {
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

      expect(differentCount).equal(DETERMINISTIC_SAMPLE_SIZE); // All values differ after jump
    });

    test('multiple jumps produce non-overlapping sequences', () => {
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

      // With proper jump, there should be no overlaps (or extremely rare collisions)
      // Allow up to 1 collision due to birthday paradox (very generous)
      expect(overlap_0_1 <= 1).equal(true); // Stream 0 and 1 should not overlap
      expect(overlap_1_2 <= 1).equal(true); // Stream 1 and 2 should not overlap
      expect(overlap_0_2 <= 1).equal(true); // Stream 0 and 2 should not overlap
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

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
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
      expect(q1 >= QUARTILE_MIN && q1 <= QUARTILE_MAX).equal(true); // Q1 has ~25K values
      expect(q2 >= QUARTILE_MIN && q2 <= QUARTILE_MAX).equal(true); // Q2 has ~25K values
      expect(q3 >= QUARTILE_MIN && q3 <= QUARTILE_MAX).equal(true); // Q3 has ~25K values
      expect(q4 >= QUARTILE_MIN && q4 <= QUARTILE_MAX).equal(true); // Q4 has ~25K values
    });

    test('Monte Carlo π estimation (100K samples)', () => {
      const inside = batchTestUnitCirclePoints(DISTRIBUTION_SAMPLE_SIZE);

      expect(inside >= 0).equal(true); // Count should be >= 0
      expect(inside <= DISTRIBUTION_SAMPLE_SIZE).equal(true); // Count should be <= total

      const piEstimate = (4.0 * <f64>inside) / <f64>DISTRIBUTION_SAMPLE_SIZE;
      const diff = piEstimate > PI
        ? piEstimate - PI
        : PI - piEstimate;

      expect(diff < PI_ESTIMATE_TOLERANCE).equal(true); // π estimate within tolerance of actual value
    });

    test('batchTestUnitCirclePoints: determinism', () => {
      const result1 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
      const result2 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      expect(result1).equal(result2); // Monte Carlo results are deterministic with same seeds
    });
  });
});
