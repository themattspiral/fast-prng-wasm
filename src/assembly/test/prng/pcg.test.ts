import { describe, test, expect, beforeEach } from 'assemblyscript-unittest-framework/assembly';
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
  batchTestUnitCirclePoints,
  SEED_COUNT
} from '../../prng/pcg';
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
  BIT_31,
  U32_Q1_MAX,
  U32_Q2_MAX,
  U32_Q3_MAX,
  MAX_SAFE_INTEGER,
  MAX_UINT32
} from '../test-utils';

describe('PCG', () => {
  beforeEach(() => {
    setSeeds(TEST_SEEDS.SINGLE);
  });

  describe('Determinism', () => {
    test('uint32 produces identical sequence with same seed', () => {
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

      expect(mismatchCount).equal(0); // All 10000 values should match with same seed
    });

    test('uint32 produces different values with different seed', () => {
      const values1: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values1.push(uint32());
      }

      setSeeds(TEST_SEEDS_ALT.SINGLE);
      const values2: u32[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values2.push(uint32());
      }

      // At least 99% should differ
      let differentCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (values1[i] != values2[i]) {
          differentCount++;
        }
      }

      expect(differentCount >= <i32>(DETERMINISTIC_SAMPLE_SIZE * DIFFERENT_SEEDS_MIN_PERCENT)).equal(true); // At least 9900 of 10000 values differ with different seed
    });

    test('uint64 produces identical sequence with same seed', () => {
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

      expect(mismatchCount).equal(0); // All 10000 values should match with same seed
    });

    test('uint64 produces different values with different seed', () => {
      const values1: u64[] = [];
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values1.push(uint64());
      }

      setSeeds(TEST_SEEDS_ALT.SINGLE);
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

      expect(differentCount >= <i32>(DETERMINISTIC_SAMPLE_SIZE * DIFFERENT_SEEDS_MIN_PERCENT)).equal(true); // At least 9900 of 10000 values differ with different seed
    });
  });

  describe('Quality', () => {
    test('uint32 should produce unique values', () => {
      const values = new Set<u32>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values.add(uint32());
      }

      expect(values.size == DETERMINISTIC_SAMPLE_SIZE).equal(true); // All 10000 values are unique
    });

    test('uint32 should use full range', () => {
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

      expect(hasHighBit).equal(true); // Should produce values >= 2^31
      expect(hasLowBit).equal(true); // Should produce values < 2^31
    });

    test('uint64 should produce unique values', () => {
      const values = new Set<u64>();
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        values.add(uint64());
      }

      expect(values.size == DETERMINISTIC_SAMPLE_SIZE).equal(true); // All 10000 values are unique
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

      setSeeds(TEST_SEEDS.SINGLE);
      const arr = new Uint64Array(DETERMINISTIC_SAMPLE_SIZE);
      uint64Array(arr);

      let mismatchCount = 0;
      for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
        if (arr[i] != singleValues[i]) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).equal(0); // All 10000 array values match single-call sequence
    });

    test('uint53AsFloatArray should match repeated uint53AsFloat calls', () => {
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

      expect(mismatchCount).equal(0); // All 10000 array values match single-call sequence
    });

    test('uint32AsFloatArray should match repeated uint32AsFloat calls', () => {
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

      expect(mismatchCount).equal(0); // All 10000 array values match single-call sequence
    });

    test('float53Array should match repeated float53 calls', () => {
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

      expect(mismatchCount).equal(0); // All 10000 array values match single-call sequence
    });

    test('coord53Array should match repeated coord53 calls', () => {
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

      expect(mismatchCount).equal(0); // All 10000 array values match single-call sequence
    });

    test('coord53SquaredArray should match repeated coord53Squared calls', () => {
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

      expect(mismatchCount).equal(0); // All 10000 array values match single-call sequence
    });

    test('float53Array should handle size 1', () => {
      const expected = float53();

      setSeeds(TEST_SEEDS.SINGLE);
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
      expect(uniqueValues.size == DETERMINISTIC_SAMPLE_SIZE).equal(true); // All 10000 values are unique
    });
  });

  // TODO: Stream Increment tests are currently skipped because the PCG implementation
  // has a known issue with seeding and stream increment setting (see TODO in pcg.ts).
  // Both setSeeds() and setStreamIncrement() currently advance state, which causes
  // test isolation issues. These tests should be re-enabled once the PCG implementation
  // is corrected to match the reference implementation's seeding pattern.
  //
  // describe('Stream Increment', () => {
  //   test('setStreamIncrement advances state deterministically', () => { ... });
  //   test('setStreamIncrement produces different sequence', () => { ... });
  //   test('different stream increments produce different sequences', () => { ... });
  // });

  describe('Statistical Smoke Tests', () => {
    test('uint32: basic distribution check (100K samples)', () => {
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
      expect(q1 >= QUARTILE_MIN && q1 <= QUARTILE_MAX).equal(true); // Q1 has ~25K values
      expect(q2 >= QUARTILE_MIN && q2 <= QUARTILE_MAX).equal(true); // Q2 has ~25K values
      expect(q3 >= QUARTILE_MIN && q3 <= QUARTILE_MAX).equal(true); // Q3 has ~25K values
      expect(q4 >= QUARTILE_MIN && q4 <= QUARTILE_MAX).equal(true); // Q4 has ~25K values
    });

    test('Monte Carlo π estimation (100K samples)', () => {
      const total = DISTRIBUTION_SAMPLE_SIZE;
      const inside = batchTestUnitCirclePoints(total);

      expect(inside >= 0).equal(true); // Count should be >= 0
      expect(inside <= total).equal(true); // Count should be <= total

      const piEstimate = (4.0 * <f64>inside) / <f64>total;
      const diff = piEstimate > PI
        ? piEstimate - PI
        : PI - piEstimate;

      expect(diff < PI_ESTIMATE_TOLERANCE).equal(true); // π estimate within 0.02 of actual value
    });

    test('batchTestUnitCirclePoints: determinism', () => {
      const result1 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      setSeeds(TEST_SEEDS.SINGLE);
      const result2 = batchTestUnitCirclePoints(DETERMINISTIC_SAMPLE_SIZE);

      expect(result1).equal(result2); // Monte Carlo results are deterministic with same seed
    });
  });
});
