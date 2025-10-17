/**
 * SIMD Conversion Function Tests
 *
 * Tests for uint64x2 to integer and float conversion functions (dual-lane SIMD).
 * Converts v128 vectors containing two uint64 values to bit-shifted integers
 * (as floats) and actual floating-point values in various ranges.
 *
 * Test Strategy:
 * - Verify SIMD results match scalar conversions for both lanes
 * - Test correct lane extraction and independence
 * - Validate output ranges for all conversion types
 * - Test edge cases (min, max, mid-range, zero)
 *
 * Contrast: These test SIMD conversion functions (dual-lane v128 processing),
 * while conversion.test.ts tests scalar conversions (single values).
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
  uint64x2_to_uint53AsFloatx2,
  uint64x2_to_uint32AsFloatx2,
  uint64x2_to_float53x2,
  uint64x2_to_coord53x2,
  uint64x2_to_coord53Squaredx2
} from '../common/conversion-simd';
import {
  HIGH_PRECISION_TOLERANCE,
  MAX_SAFE_INTEGER,
  MAX_UINT32,
  SIMD_LANE_0,
  SIMD_LANE_1
} from './helpers/test-utils';
import {
  assertGreaterThanOrEqual,
  assertLessThan,
  assertLessThanOrEqual
} from './helpers/assertion-helpers';

describe('uint64x2_to_uint53AsFloatx2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint53AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0).equal(uint64_to_uint53AsFloat(input1)); // SIMD lane 0 matches scalar result
    expect(lane1).equal(uint64_to_uint53AsFloat(input2)); // SIMD lane 1 matches scalar result
  });

  test('should extract correct lanes', () => {
    const input1: u64 = 12345678901234567890;
    const input2: u64 = 9876543210987654321;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint53AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    assertGreaterThanOrEqual(lane0, 0, "Lane 0 is non-negative");
    assertLessThanOrEqual(lane0, MAX_SAFE_INTEGER, "Lane 0 within MAX_SAFE_INTEGER");
    assertGreaterThanOrEqual(lane1, 0, "Lane 1 is non-negative");
    assertLessThanOrEqual(lane1, MAX_SAFE_INTEGER, "Lane 1 within MAX_SAFE_INTEGER");
    expect(lane0 != lane1).equal(true);
  });
});

describe('uint64x2_to_uint32AsFloatx2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint32AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0).equal(uint64_to_uint32AsFloat(input1));
    expect(lane1).equal(uint64_to_uint32AsFloat(input2));
  });

  test('should extract correct lanes', () => {
    const input1: u64 = 12345678901234567890;
    const input2: u64 = 9876543210987654321;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint32AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    assertGreaterThanOrEqual(lane0, 0, "Lane 0 is non-negative");
    assertLessThanOrEqual(lane0, MAX_UINT32, "Lane 0 within MAX_UINT32");
    assertGreaterThanOrEqual(lane1, 0, "Lane 1 is non-negative");
    assertLessThanOrEqual(lane1, MAX_UINT32, "Lane 1 within MAX_UINT32");
    expect(lane0 != lane1).equal(true);
  });
});

describe('uint64x2_to_float53x2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_float53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0).equal(uint64_to_float53(input1));
    expect(lane1).equal(uint64_to_float53(input2));
  });

  test('should produce values in [0, 1) for both lanes', () => {
    const input1: u64 = 0;
    const input2: u64 = 0xFFFFFFFFFFFFFFFF;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_float53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    assertGreaterThanOrEqual(lane0, 0, "Lane 0 lower bound");
    assertLessThan(lane0, 1, "Lane 0 upper bound");
    assertGreaterThanOrEqual(lane1, 0, "Lane 1 lower bound");
    assertLessThan(lane1, 1, "Lane 1 upper bound");
  });

  test('mid-range should be exactly 0.5', () => {
    const mid: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(mid, mid);

    const result = uint64x2_to_float53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0 == 0.5).equal(true);
    expect(lane1 == 0.5).equal(true);
  });
});

describe('uint64x2_to_coord53x2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_coord53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0).equal(uint64_to_coord53(input1));
    expect(lane1).equal(uint64_to_coord53(input2));
  });

  test('should produce values in [-1, 1) for both lanes', () => {
    const input1: u64 = 0;
    const input2: u64 = 0xFFFFFFFFFFFFFFFF;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_coord53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    assertGreaterThanOrEqual(lane0, -1, "Lane 0 lower bound");
    assertLessThan(lane0, 1, "Lane 0 upper bound");
    assertGreaterThanOrEqual(lane1, -1, "Lane 1 lower bound");
    assertLessThan(lane1, 1, "Lane 1 upper bound");
  });

  test('mid-range should be exactly 0', () => {
    const mid: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(mid, mid);

    const result = uint64x2_to_coord53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0 == 0).equal(true);
    expect(lane1 == 0).equal(true);
  });

  test('min should be -1', () => {
    const inputVec: v128 = i64x2(0, 0);

    const result = uint64x2_to_coord53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0 == -1).equal(true);
    expect(lane1 == -1).equal(true);
  });
});

describe('uint64x2_to_coord53Squaredx2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_coord53Squaredx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    expect(lane0).equal(uint64_to_coord53Squared(input1));
    expect(lane1).equal(uint64_to_coord53Squared(input2));
  });

  test('should match manual squaring (high precision)', () => {
    const input1: u64 = 12345678901234567890;
    const input2: u64 = 9876543210987654321;
    const inputVec: v128 = i64x2(input1, input2);

    const coord1 = uint64_to_coord53(input1);
    const coord2 = uint64_to_coord53(input2);
    const result = uint64x2_to_coord53Squaredx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    const diff0 = lane0 > coord1 * coord1
      ? lane0 - coord1 * coord1
      : coord1 * coord1 - lane0;
    const diff1 = lane1 > coord2 * coord2
      ? lane1 - coord2 * coord2
      : coord2 * coord2 - lane1;

    assertLessThan(diff0, HIGH_PRECISION_TOLERANCE, "Lane 0 precision");
    assertLessThan(diff1, HIGH_PRECISION_TOLERANCE, "Lane 1 precision");
  });

  test('should always be in [0, 1] for both lanes', () => {
    const input1: u64 = 0;
    const input2: u64 = 0xFFFFFFFFFFFFFFFF;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_coord53Squaredx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_0);
    const lane1 = v128.extract_lane<f64>(result, <u8>SIMD_LANE_1);

    assertGreaterThanOrEqual(lane0, 0, "Lane 0 squared value is non-negative");
    assertLessThanOrEqual(lane0, 1, "Lane 0 upper bound is inclusive");
    assertGreaterThanOrEqual(lane1, 0, "Lane 1 squared value is non-negative");
    assertLessThanOrEqual(lane1, 1, "Lane 1 upper bound is inclusive");
  });
});
