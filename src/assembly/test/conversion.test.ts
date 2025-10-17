/**
 * Scalar Conversion Function Tests
 *
 * Tests for uint64 to integer and float conversion functions (non-SIMD).
 * Converts raw uint64 values to bit-shifted integers (as floats) and actual
 * floating-point values in various ranges.
 *
 * Test Strategy:
 * - Verify correct output ranges for all conversion types
 * - Test edge cases (min, max, mid-range, zero)
 * - Validate bit manipulation (precision, rounding, shifting)
 *
 * Contrast: These test scalar conversion functions (single values), while
 * conversion-simd.test.ts tests SIMD conversions (dual-lane processing).
 */

import { describe, test, expect } from 'assemblyscript-unittest-framework/assembly';
import {
  uint64_to_uint53AsFloat,
  uint64_to_uint32AsFloat,
  uint64_to_float53,
  uint64_to_coord53,
  uint64_to_coord53Squared
} from '../common/conversion';
import {
  HIGH_PRECISION_TOLERANCE,
  MAX_UINT64_TO_FLOAT_LOWER_BOUND,
  MAX_SAFE_INTEGER,
  MAX_UINT32
} from './helpers/test-utils';
import {
  assertGreaterThanOrEqual,
  assertLessThan,
  assertLessThanOrEqual,
  assertGreaterThan
} from './helpers/assertion-helpers';

describe('uint64_to_float53', () => {
  test('max value should be < 1', () => {
    const input: u64 = 0xFFFFFFFFFFFFFFFF;
    const result = uint64_to_float53(input);

    assertGreaterThanOrEqual(result, 0, "result is non-negative");
    assertLessThan(result, 1, "result < 1");
  });

  test('zero should be exactly 0', () => {
    const result = uint64_to_float53(0);
    expect(result).equal(0);
  });

  test('mid-range should be exactly 0.5', () => {
    const mid: u64 = 0x8000000000000000;
    const result = uint64_to_float53(mid);

    // 0.5 is exactly representable in f64
    expect(result).equal(0.5);
  });

  test('should ignore bottom 11 bits', () => {
    const base: u64 = 0x1000000000000000;
    const withNoise: u64 = 0x10000000000007FF;

    const result1 = uint64_to_float53(base);
    const result2 = uint64_to_float53(withNoise);

    expect(result1).equal(result2);
  });

  test('should use unsigned right shift', () => {
    const highBitSet: u64 = 0xFFFFFFFFFFFFFFFF;
    const result = uint64_to_float53(highBitSet);

    assertGreaterThanOrEqual(result, 0, "Logical shift (>>>) preserves unsigned value");
    assertLessThan(result, 1, "Still within [0, 1) range");
    assertGreaterThan(result, MAX_UINT64_TO_FLOAT_LOWER_BOUND, "Max u64 produces value very close to 1");
  });
});

describe('uint64_to_coord53', () => {
  test('should produce values in [-1, 1)', () => {
    const inputs: u64[] = [0, 0x8000000000000000, 0xFFFFFFFFFFFFFFFF];

    for (let i = 0; i < inputs.length; i++) {
      const result = uint64_to_coord53(inputs[i]);
      expect(result >= -1).equal(true);
      expect(result < 1).equal(true);
    }
  });

  test('mid-range should be exactly 0', () => {
    const mid: u64 = 0x8000000000000000;
    const result = uint64_to_coord53(mid);

    // 0.5 * 2 - 1 = 0
    expect(result == 0).equal(true);
  });

  test('min should be -1', () => {
    const result = uint64_to_coord53(0);
    expect(result == -1).equal(true);
  });
});

describe('uint64_to_coord53Squared', () => {
  test('should match manual squaring (high precision)', () => {
    const inputs: u64[] = [0, 12345678901234567890, 0xFFFFFFFFFFFFFFFF, 0x8000000000000000];

    for (let i = 0; i < inputs.length; i++) {
      const coord = uint64_to_coord53(inputs[i]);
      const coordSquared = uint64_to_coord53Squared(inputs[i]);
      const manualSquared = coord * coord;

      const diff = coordSquared > manualSquared
        ? coordSquared - manualSquared
        : manualSquared - coordSquared;

      assertLessThan(diff, HIGH_PRECISION_TOLERANCE, "Optimized coord squared matches manual squaring within high precision tolerance");
    }
  });

  test('should always be in [0, 1]', () => {
    const inputs: u64[] = [0, 0x8000000000000000, 0xFFFFFFFFFFFFFFFF];

    for (let i = 0; i < inputs.length; i++) {
      const result = uint64_to_coord53Squared(inputs[i]);
      expect(result >= 0).equal(true); // Squared value is non-negative
      expect(result <= 1).equal(true); // Upper bound is inclusive (squaring -1 gives exactly 1)
    }
  });
});

describe('uint64_to_uint53AsFloat', () => {
  test('should be in [0, 2^53-1]', () => {
    const inputs: u64[] = [0, 0xFFFFFFFFFFFFFFFF, 0x8000000000000000];

    for (let i = 0; i < inputs.length; i++) {
      const result = uint64_to_uint53AsFloat(inputs[i]);
      assertGreaterThanOrEqual(result, 0, "result >= 0");
      assertLessThanOrEqual(result, MAX_SAFE_INTEGER, "result <= 2^53-1");
    }
  });
});

describe('uint64_to_uint32AsFloat', () => {
  test('should be in [0, 2^32-1]', () => {
    const inputs: u64[] = [0, 0xFFFFFFFFFFFFFFFF, 0x8000000000000000];

    for (let i = 0; i < inputs.length; i++) {
      const result = uint64_to_uint32AsFloat(inputs[i]);
      assertGreaterThanOrEqual(result, 0, "result >= 0");
      assertLessThanOrEqual(result, MAX_UINT32, "result <= 2^32-1");
    }
  });
});
