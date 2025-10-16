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
  uint64_to_coord53Squared,
  BIT_53
} from '../common/conversion';

describe('uint64_to_float53', () => {
  test('max value should be < 1', () => {
    const input: u64 = 0xFFFFFFFFFFFFFFFF;
    const result = uint64_to_float53(input);

    expect(result >= 0).equal(true); // Should be non-negative
    expect(result < 1).equal(true); // Should be < 1 (exclusive upper bound)
  });

  test('zero should be exactly 0', () => {
    const result = uint64_to_float53(0);
    expect(result == 0).equal(true);
  });

  test('mid-range should be exactly 0.5', () => {
    const mid: u64 = 0x8000000000000000;
    const result = uint64_to_float53(mid);

    // 0.5 is exactly representable in f64
    expect(result == 0.5).equal(true);
  });

  test('should ignore bottom 11 bits', () => {
    const base: u64 = 0x1000000000000000;
    const withNoise: u64 = 0x10000000000007FF;

    const result1 = uint64_to_float53(base);
    const result2 = uint64_to_float53(withNoise);

    expect(result1 == result2).equal(true);
  });

  test('should use unsigned right shift', () => {
    const highBitSet: u64 = 0xFFFFFFFFFFFFFFFF;
    const result = uint64_to_float53(highBitSet);

    expect(result >= 0).equal(true); // Unsigned shift keeps result positive
    expect(result < 1).equal(true); // Still within [0, 1) range
    expect(result > 0.999999).equal(true); // Max u64 produces value very close to 1
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

      // High precision: within 1e-15
      expect(diff < 1e-15).equal(true);
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
      expect(result >= 0).equal(true);
      expect(result <= 9007199254740991).equal(true);
    }
  });
});

describe('uint64_to_uint32AsFloat', () => {
  test('should be in [0, 2^32-1]', () => {
    const inputs: u64[] = [0, 0xFFFFFFFFFFFFFFFF, 0x8000000000000000];

    for (let i = 0; i < inputs.length; i++) {
      const result = uint64_to_uint32AsFloat(inputs[i]);
      expect(result >= 0).equal(true);
      expect(result <= 4294967295).equal(true);
    }
  });
});
