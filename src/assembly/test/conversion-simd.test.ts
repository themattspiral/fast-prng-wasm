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

describe('uint64x2_to_uint53AsFloatx2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint53AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0).equal(uint64_to_uint53AsFloat(input1)); // SIMD lane 0 matches scalar result
    expect(lane1).equal(uint64_to_uint53AsFloat(input2)); // SIMD lane 1 matches scalar result
  });

  test('should extract correct lanes', () => {
    const input1: u64 = 12345678901234567890;
    const input2: u64 = 9876543210987654321;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint53AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0 >= 0).equal(true);
    expect(lane0 <= 9007199254740991).equal(true);
    expect(lane1 >= 0).equal(true);
    expect(lane1 <= 9007199254740991).equal(true);
    expect(lane0 != lane1).equal(true);
  });
});

describe('uint64x2_to_uint32AsFloatx2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint32AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0).equal(uint64_to_uint32AsFloat(input1));
    expect(lane1).equal(uint64_to_uint32AsFloat(input2));
  });

  test('should extract correct lanes', () => {
    const input1: u64 = 12345678901234567890;
    const input2: u64 = 9876543210987654321;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_uint32AsFloatx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0 >= 0).equal(true);
    expect(lane0 <= 4294967295).equal(true);
    expect(lane1 >= 0).equal(true);
    expect(lane1 <= 4294967295).equal(true);
    expect(lane0 != lane1).equal(true);
  });
});

describe('uint64x2_to_float53x2', () => {
  test('should match scalar version for both lanes', () => {
    const input1: u64 = 0xFFFFFFFFFFFFFFFF;
    const input2: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_float53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0).equal(uint64_to_float53(input1));
    expect(lane1).equal(uint64_to_float53(input2));
  });

  test('should produce values in [0, 1) for both lanes', () => {
    const input1: u64 = 0;
    const input2: u64 = 0xFFFFFFFFFFFFFFFF;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_float53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0 >= 0).equal(true);
    expect(lane0 < 1).equal(true);
    expect(lane1 >= 0).equal(true);
    expect(lane1 < 1).equal(true);
  });

  test('mid-range should be exactly 0.5', () => {
    const mid: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(mid, mid);

    const result = uint64x2_to_float53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

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
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0).equal(uint64_to_coord53(input1));
    expect(lane1).equal(uint64_to_coord53(input2));
  });

  test('should produce values in [-1, 1) for both lanes', () => {
    const input1: u64 = 0;
    const input2: u64 = 0xFFFFFFFFFFFFFFFF;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_coord53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0 >= -1).equal(true);
    expect(lane0 < 1).equal(true);
    expect(lane1 >= -1).equal(true);
    expect(lane1 < 1).equal(true);
  });

  test('mid-range should be exactly 0', () => {
    const mid: u64 = 0x8000000000000000;
    const inputVec: v128 = i64x2(mid, mid);

    const result = uint64x2_to_coord53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0 == 0).equal(true);
    expect(lane1 == 0).equal(true);
  });

  test('min should be -1', () => {
    const inputVec: v128 = i64x2(0, 0);

    const result = uint64x2_to_coord53x2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

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
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

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
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    const diff0 = lane0 > coord1 * coord1
      ? lane0 - coord1 * coord1
      : coord1 * coord1 - lane0;
    const diff1 = lane1 > coord2 * coord2
      ? lane1 - coord2 * coord2
      : coord2 * coord2 - lane1;

    expect(diff0 < 1e-15).equal(true);
    expect(diff1 < 1e-15).equal(true);
  });

  test('should always be in [0, 1] for both lanes', () => {
    const input1: u64 = 0;
    const input2: u64 = 0xFFFFFFFFFFFFFFFF;
    const inputVec: v128 = i64x2(input1, input2);

    const result = uint64x2_to_coord53Squaredx2(inputVec);
    const lane0 = v128.extract_lane<f64>(result, 0);
    const lane1 = v128.extract_lane<f64>(result, 1);

    expect(lane0 >= 0).equal(true); // Lane 0 squared value is non-negative
    expect(lane0 <= 1).equal(true); // Lane 0 upper bound is inclusive
    expect(lane1 >= 0).equal(true); // Lane 1 squared value is non-negative
    expect(lane1 <= 1).equal(true); // Lane 1 upper bound is inclusive
  });
});
