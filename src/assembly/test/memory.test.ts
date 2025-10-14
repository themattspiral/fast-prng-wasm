import { describe, test, expect } from 'assemblyscript-unittest-framework/assembly';
import {
  allocUint64Array,
  allocFloat64Array
} from '../common/memory';

// Note: These tests are intentionally minimal because:
// 1. Release builds use stub runtime (bump allocator, no GC), so arrays persist for the lifetime of the WASM instance
// 2. Release builds have 64KB memory limit, so we test small allocations only
// 3. These functions are thoroughly tested via JS integration tests (memory.test.ts, array-methods.test.ts)
// 4. The main goal is to achieve AS coverage metrics for the allocation functions

describe('Memory Management', () => {
  describe('allocUint64Array', () => {
    test('should return non-zero pointer', () => {
      const ptr = allocUint64Array(10);

      expect(ptr > 0).equal(true); // Pointer is non-zero
    });

    test('should allocate array with correct length', () => {
      const size = 100;
      const ptr = allocUint64Array(size);
      const arr = changetype<Uint64Array>(ptr);

      expect(arr.length).equal(size); // Array has correct size
    });

    test('should allocate writable memory', () => {
      const ptr = allocUint64Array(10);
      const arr = changetype<Uint64Array>(ptr);

      arr[0] = 12345;
      arr[5] = 67890;

      expect(arr[0]).equal(12345); // Can write and read back values
      expect(arr[5]).equal(67890);
    });
  });

  describe('allocFloat64Array', () => {
    test('should return non-zero pointer', () => {
      const ptr = allocFloat64Array(10);

      expect(ptr > 0).equal(true); // Pointer is non-zero
    });

    test('should allocate array with correct length', () => {
      const size = 100;
      const ptr = allocFloat64Array(size);
      const arr = changetype<Float64Array>(ptr);

      expect(arr.length).equal(size); // Array has correct size
    });

    test('should allocate writable memory', () => {
      const ptr = allocFloat64Array(10);
      const arr = changetype<Float64Array>(ptr);

      arr[0] = 0.12345;
      arr[5] = 0.67890;

      expect(arr[0]).equal(0.12345); // Can write and read back values
      expect(arr[5]).equal(0.67890);
    });
  });
});
