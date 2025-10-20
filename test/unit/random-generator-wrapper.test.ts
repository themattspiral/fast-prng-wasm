/**
 * Unit tests for the RandomGenerator wrapper class.
 *
 * These tests import directly from src/ to enable coverage tracking,
 * with WASM modules mocked to isolate wrapper logic.
 *
 * Integration tests (in test/integration/) import from the built package
 * to verify the bundled output works correctly with real WASM.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRNGType } from '../../src/types/prng';
import { getSeedsForPRNG } from '../helpers/test-utils';

/**
 * Creates a mock PRNG with predictable, incrementing values.
 *
 * This mock uses incrementing values (1001n, 1002n, etc.) instead of realistic
 * random numbers. This is intentional and serves several testing purposes:
 *
 * 1. **Verifies wrapper logic**: Tests that the wrapper correctly calls WASM methods
 *    and returns values without caching or interference
 * 2. **Proves uniqueness**: Incrementing values make it obvious if the wrapper
 *    incorrectly returns the same value multiple times
 * 3. **Simplifies assertions**: Predictable values make test expectations clear
 *    and failures easy to diagnose
 * 4. **Isolates concerns**: Unit tests focus on the wrapper's behavior, not the
 *    statistical properties of PRNGs (which are tested in integration tests)
 *
 * For testing actual PRNG behavior and statistical properties, see the integration
 * test suite.
 */
function createMockPRNG(seedCount: number, hasJump: boolean = true) {
  const mockMemory = new WebAssembly.Memory({ initial: 1 });
  let callCount = 0;

  const baseMock = {
    memory: mockMemory,
    SEED_COUNT: { value: seedCount },
    setSeeds: vi.fn(),

    // Single value methods - return unique, recognizable values on each call
    uint64: vi.fn(() => BigInt(1000 + ++callCount)),
    uint53AsFloat: vi.fn(() => 2000 + callCount++),
    uint32AsFloat: vi.fn(() => 3000 + callCount++),
    float53: vi.fn(() => 0.5 + (callCount++ * 0.01)),
    coord53: vi.fn(() => -0.123 + (callCount++ * 0.001)),
    coord53Squared: vi.fn(() => 0.456 + (callCount++ * 0.001)),

    // Array methods
    uint64Array: vi.fn(),
    uint53AsFloatArray: vi.fn(),
    uint32AsFloatArray: vi.fn(),
    float53Array: vi.fn(),
    coord53Array: vi.fn(),
    coord53SquaredArray: vi.fn(),

    // Array allocation - return mock pointers with proper structure
    allocUint64Array: vi.fn((size: number) => {
      // Simulate AS array header: [rtId, rtSize, byteOffset, byteLength]
      const view = new DataView(mockMemory.buffer);
      const ptr = 16;
      view.setUint32(ptr + 4, 128, true); // byte offset
      view.setUint32(ptr + 8, size * 8, true); // byte length
      return ptr;
    }),
    allocFloat64Array: vi.fn((size: number) => {
      const view = new DataView(mockMemory.buffer);
      const ptr = 1024;
      view.setUint32(ptr + 4, 2048, true); // byte offset
      view.setUint32(ptr + 8, size * 8, true); // byte length
      return ptr;
    }),

    batchTestUnitCirclePoints: vi.fn((count: number) => Math.floor(count * 0.785))
  };

  // Add jump() for Xoshiro/Xoroshiro generators or setStreamIncrement() for PCG
  if (hasJump) {
    return { ...baseMock, jump: vi.fn() };
  } else {
    return { ...baseMock, setStreamIncrement: vi.fn() };
  }
}

// Mock the WASM imports before importing RandomGenerator
vi.mock('../../bin/pcg.wasm', () => ({
  default: vi.fn(() => ({ exports: createMockPRNG(1, false) })) // PCG uses setStreamIncrement
}));

vi.mock('../../bin/xoroshiro128plus.wasm', () => ({
  default: vi.fn(() => ({ exports: createMockPRNG(2, true) })) // Xoroshiro uses jump
}));

vi.mock('../../bin/xoroshiro128plus-simd.wasm', () => ({
  default: vi.fn(() => ({ exports: createMockPRNG(4, true) }))
}));

vi.mock('../../bin/xoshiro256plus.wasm', () => ({
  default: vi.fn(() => ({ exports: createMockPRNG(4, true) }))
}));

vi.mock('../../bin/xoshiro256plus-simd.wasm', () => ({
  default: vi.fn(() => ({ exports: createMockPRNG(8, true) }))
}));

// Now import RandomGenerator after mocks are set up
import { RandomGenerator } from '../../src/random-generator';

describe('RandomGenerator Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should create instance with provided seeds', () => {
            const seeds = getSeedsForPRNG(PRNGType.Xoroshiro128Plus);
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);

            // Verify wrapper internal state
            expect(gen).toBeInstanceOf(RandomGenerator);
            expect(gen.seeds).toEqual(seeds);

            // Verify wrapper calls setSeeds with exact seed values
            expect((gen as any)._instance.setSeeds).toHaveBeenCalledWith(...seeds);
        });

        it('should auto-seed when seeds not provided', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus);

            expect(gen.seeds).toBeDefined();
            expect(gen.seeds.length).toBeGreaterThanOrEqual(2); // Default auto-seed generates 8 seeds
            
            // Verify wrapper calls setSeeds with generated seeds
            expect((gen as any)._instance.setSeeds).toHaveBeenCalled();
            const callArgs = ((gen as any)._instance.setSeeds as any).mock.calls[0];
            expect(callArgs).toEqual([...gen.seeds]); // Arguments should match stored seeds
        });

        it('should throw when insufficient seeds provided', () => {
            expect(() => {
                new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.PCG)); // needs 2, only provided 1
            }).toThrow(/requires 2 seeds/);
        });

        it('should throw on zero-size arrays', () => {
            expect(() => {
                new RandomGenerator(PRNGType.Xoroshiro128Plus, null, null, 0);
            }).toThrow(/must be positive/);
        });

        it('should throw on negative array sizes', () => {
            expect(() => {
                new RandomGenerator(PRNGType.Xoroshiro128Plus, null, null, -1);
            }).toThrow(/must be positive/);
        });

        it('should throw on odd-size arrays for SIMD algorithms', () => {
            const simdTypes = [
                PRNGType.Xoroshiro128Plus_SIMD,
                PRNGType.Xoshiro256Plus_SIMD
            ];

            for (const type of simdTypes) {
                expect(() => {
                    new RandomGenerator(type, null, null, 101);  // Odd size
                }).toThrow(/requires even outputArraySize/);
            }
        });

        it('should accept even-size arrays for SIMD algorithms', () => {
            expect(() => {
                const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, null, null, 100);  // Even size
                expect(gen.outputArraySize).toBe(100);
            }).not.toThrow();
        });

        it('should set custom outputArraySize', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus), null, 500);
            expect(gen.outputArraySize).toBe(500);
        });

        it('should use default outputArraySize of 1000', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            expect(gen.outputArraySize).toBe(1000);
        });
    });

    describe('Getters', () => {
        it('should get prngType', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            expect(gen.prngType).toBe(PRNGType.Xoroshiro128Plus);
        });

        it('should get seedCount', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            expect(gen.seedCount).toBe(2);
        });

        it('should get seeds', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            expect(gen.seeds).toEqual(getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
        });

        it('should get outputArraySize', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus), null, 750);
            expect(gen.outputArraySize).toBe(750);
        });
    });

    describe('Single value methods', () => {
        it('should call int64() and return bigint', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));

            // Call wrapper method
            const val = gen.int64();

            // Get the value that the mock returned
            const mockReturnValue = ((gen as any)._instance.uint64 as any).mock.results[0].value;

            // Verify wrapper called WASM method and returned its exact value
            expect((gen as any)._instance.uint64).toHaveBeenCalled();
            expect(val).toBe(mockReturnValue);
            expect(typeof val).toBe('bigint');
        });

        it('should call int53() and return number', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));

            // Call wrapper method
            const val = gen.int53();

            // Get the value that the mock returned
            const mockReturnValue = ((gen as any)._instance.uint53AsFloat as any).mock.results[0].value;

            // Verify wrapper called WASM method and returned its exact value
            expect((gen as any)._instance.uint53AsFloat).toHaveBeenCalled();
            expect(val).toBe(mockReturnValue);
            expect(typeof val).toBe('number');
        });

        it('should call int32() and return number', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));

            // Call wrapper method
            const val = gen.int32();

            // Get the value that the mock returned
            const mockReturnValue = ((gen as any)._instance.uint32AsFloat as any).mock.results[0].value;

            // Verify wrapper called WASM method and returned its exact value
            expect((gen as any)._instance.uint32AsFloat).toHaveBeenCalled();
            expect(val).toBe(mockReturnValue);
            expect(typeof val).toBe('number');
        });

        it('should call float()', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));

            // Call wrapper method
            const val = gen.float();

            // Get the value that the mock returned
            const mockReturnValue = ((gen as any)._instance.float53 as any).mock.results[0].value;

            // Verify wrapper called WASM method and returned its exact value
            expect((gen as any)._instance.float53).toHaveBeenCalled();
            expect(val).toBe(mockReturnValue);
            expect(typeof val).toBe('number');
        });

        it('should call coord()', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));

            // Call wrapper method
            const val = gen.coord();

            // Get the value that the mock returned
            const mockReturnValue = ((gen as any)._instance.coord53 as any).mock.results[0].value;

            // Verify wrapper called WASM method and returned its exact value
            expect((gen as any)._instance.coord53).toHaveBeenCalled();
            expect(val).toBe(mockReturnValue);
            expect(typeof val).toBe('number');
        });

        it('should call coordSquared()', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));

            // Call wrapper method
            const val = gen.coordSquared();

            // Get the value that the mock returned
            const mockReturnValue = ((gen as any)._instance.coord53Squared as any).mock.results[0].value;

            // Verify wrapper called WASM method and returned its exact value
            expect((gen as any)._instance.coord53Squared).toHaveBeenCalled();
            expect(val).toBe(mockReturnValue);
            expect(typeof val).toBe('number');
        });
    });

    describe('Array methods', () => {
        it('should call int64Array() and return BigUint64Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr = gen.int64Array();

            // Get the pointer that was allocated during construction
            const allocatedPtr = ((gen as any)._instance.allocUint64Array as any).mock.results[0].value;

            // Verify wrapper calls allocation during setup with correct size,
            // then fill method with the allocated pointer
            expect((gen as any)._instance.allocUint64Array).toHaveBeenCalledWith(gen.outputArraySize);
            expect((gen as any)._instance.uint64Array).toHaveBeenCalledWith(allocatedPtr);
            expect(arr).toBeInstanceOf(BigUint64Array);
            expect(arr.length).toBe(gen.outputArraySize);
        });

        it('should call int53Array() and return Float64Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr = gen.int53Array();

            // Get the pointer that was allocated during construction
            const allocatedPtr = ((gen as any)._instance.allocFloat64Array as any).mock.results[0].value;

            // Verify wrapper calls allocation during setup with correct size,
            // then fill method with the allocated pointer
            expect((gen as any)._instance.allocFloat64Array).toHaveBeenCalledWith(gen.outputArraySize);
            expect((gen as any)._instance.uint53AsFloatArray).toHaveBeenCalledWith(allocatedPtr);
            expect(arr).toBeInstanceOf(Float64Array);
            expect(arr.length).toBe(gen.outputArraySize);
        });

        it('should call int32Array() and return Float64Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr = gen.int32Array();

            // Get the pointer that was allocated during construction
            const allocatedPtr = ((gen as any)._instance.allocFloat64Array as any).mock.results[0].value;

            // Verify wrapper calls allocation during setup with correct size,
            // then fill method with the allocated pointer
            expect((gen as any)._instance.allocFloat64Array).toHaveBeenCalledWith(gen.outputArraySize);
            expect((gen as any)._instance.uint32AsFloatArray).toHaveBeenCalledWith(allocatedPtr);
            expect(arr).toBeInstanceOf(Float64Array);
            expect(arr.length).toBe(gen.outputArraySize);
        });

        it('should call floatArray() and return Float64Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr = gen.floatArray();

            // Get the pointer that was allocated during construction
            const allocatedPtr = ((gen as any)._instance.allocFloat64Array as any).mock.results[0].value;

            // Verify wrapper calls allocation during setup with correct size,
            // then fill method with the allocated pointer
            expect((gen as any)._instance.allocFloat64Array).toHaveBeenCalledWith(gen.outputArraySize);
            expect((gen as any)._instance.float53Array).toHaveBeenCalledWith(allocatedPtr);
            expect(arr).toBeInstanceOf(Float64Array);
            expect(arr.length).toBe(gen.outputArraySize);
        });

        it('should call coordArray() and return Float64Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr = gen.coordArray();

            // Get the pointer that was allocated during construction
            const allocatedPtr = ((gen as any)._instance.allocFloat64Array as any).mock.results[0].value;

            // Verify wrapper calls allocation during setup with correct size,
            // then fill method with the allocated pointer
            expect((gen as any)._instance.allocFloat64Array).toHaveBeenCalledWith(gen.outputArraySize);
            expect((gen as any)._instance.coord53Array).toHaveBeenCalledWith(allocatedPtr);
            expect(arr).toBeInstanceOf(Float64Array);
            expect(arr.length).toBe(gen.outputArraySize);
        });

        it('should call coordSquaredArray() and return Float64Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr = gen.coordSquaredArray();

            // Get the pointer that was allocated during construction
            const allocatedPtr = ((gen as any)._instance.allocFloat64Array as any).mock.results[0].value;

            // Verify wrapper calls allocation during setup with correct size,
            // then fill method with the allocated pointer
            expect((gen as any)._instance.allocFloat64Array).toHaveBeenCalledWith(gen.outputArraySize);
            expect((gen as any)._instance.coord53SquaredArray).toHaveBeenCalledWith(allocatedPtr);
            expect(arr).toBeInstanceOf(Float64Array);
            expect(arr.length).toBe(gen.outputArraySize);
        });

        it('should reuse array buffer on subsequent calls', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.floatArray();
            const arr2 = gen.floatArray();

            // Same buffer reference
            expect(arr1.buffer).toBe(arr2.buffer);
        });

        it('should return independent copy when copy=true for int64Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.int64Array(true);
            const arr2 = gen.int64Array(true);

            // Different array instances
            expect(arr1).not.toBe(arr2);
            expect(arr1.buffer).not.toBe(arr2.buffer);
        });

        it('should return independent copy when copy=true for floatArray', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.floatArray(true);
            const arr2 = gen.floatArray(true);

            // Different array instances
            expect(arr1).not.toBe(arr2);
            expect(arr1.buffer).not.toBe(arr2.buffer);
        });

        it('should return independent copy when copy=true for int53Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.int53Array(true);
            const arr2 = gen.int53Array(true);

            // Different array instances
            expect(arr1).not.toBe(arr2);
            expect(arr1.buffer).not.toBe(arr2.buffer);
        });

        it('should return independent copy when copy=true for int32Array', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.int32Array(true);
            const arr2 = gen.int32Array(true);

            // Different array instances
            expect(arr1).not.toBe(arr2);
            expect(arr1.buffer).not.toBe(arr2.buffer);
        });

        it('should return independent copy when copy=true for coordArray', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.coordArray(true);
            const arr2 = gen.coordArray(true);

            // Different array instances
            expect(arr1).not.toBe(arr2);
            expect(arr1.buffer).not.toBe(arr2.buffer);
        });

        it('should return independent copy when copy=true for coordSquaredArray', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.coordSquaredArray(true);
            const arr2 = gen.coordSquaredArray(true);

            // Different array instances
            expect(arr1).not.toBe(arr2);
            expect(arr1.buffer).not.toBe(arr2.buffer);
        });

        it('should reuse buffer when copy=false (default)', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const arr1 = gen.floatArray(false);
            const arr2 = gen.floatArray(); // Default is false

            // Same buffer reference
            expect(arr1).toBe(arr2);
        });
    });

    describe('Monte Carlo method', () => {
        it('should call batchTestUnitCirclePoints()', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            const pointCount = 1000;
            const count = gen.batchTestUnitCirclePoints(pointCount);

            // Get the value that the mock returned
            const mockReturnValue = ((gen as any)._instance.batchTestUnitCirclePoints as any).mock.results[0].value;

            // Verify wrapper calls underlying WASM method with correct argument and returns its exact value
            expect((gen as any)._instance.batchTestUnitCirclePoints).toHaveBeenCalledWith(pointCount);
            expect(count).toBe(mockReturnValue);
            expect(typeof count).toBe('number');
        });
    });

    describe('Stream ID (uniqueStreamId parameter)', () => {
        // Generators that support jump() - all Xoshiro/Xoroshiro variants
        const JUMP_CAPABLE_GENERATORS = [
            { type: PRNGType.Xoroshiro128Plus, seeds: getSeedsForPRNG(PRNGType.Xoroshiro128Plus) },
            { type: PRNGType.Xoroshiro128Plus_SIMD, seeds: getSeedsForPRNG(PRNGType.Xoroshiro128Plus_SIMD) },
            { type: PRNGType.Xoshiro256Plus, seeds: getSeedsForPRNG(PRNGType.Xoshiro256Plus) },
            { type: PRNGType.Xoshiro256Plus_SIMD, seeds: getSeedsForPRNG(PRNGType.Xoshiro256Plus_SIMD) }
        ];

        describe('Jump-capable generators (Xoshiro/Xoroshiro)', () => {
            for (const { type, seeds } of JUMP_CAPABLE_GENERATORS) {
                it(`${type}: should call jump() with positive stream ID`, () => {
                    const streamId = 3;
                    const gen = new RandomGenerator(type, seeds, streamId);

                    // Verify jump was called the correct number of times
                    expect((gen as any)._instance.jump).toHaveBeenCalledTimes(streamId);
                });

                it(`${type}: should not call jump() when stream ID is null`, () => {
                    const gen = new RandomGenerator(type, seeds, null);

                    // Verify jump was not called
                    expect((gen as any)._instance.jump).not.toHaveBeenCalled();
                });

                it(`${type}: should not call jump() when stream ID is 0`, () => {
                    const gen = new RandomGenerator(type, seeds, 0);

                    // Verify jump was not called
                    expect((gen as any)._instance.jump).not.toHaveBeenCalled();
                });

                it(`${type}: should not call jump() when stream ID is negative`, () => {
                    const gen = new RandomGenerator(type, seeds, -1);

                    // Verify jump was not called
                    expect((gen as any)._instance.jump).not.toHaveBeenCalled();
                });
            }
        });

        describe('PCG (increment-based stream selection)', () => {
            it('should call setStreamIncrement() BEFORE setSeeds() with positive stream ID', () => {
                const streamId = 5;
                const gen = new RandomGenerator(PRNGType.PCG, getSeedsForPRNG(PRNGType.PCG), streamId);

                // Get the mock call data
                const setStreamIncrementMock = (gen as any)._instance.setStreamIncrement;
                const setSeedsMock = (gen as any)._instance.setSeeds;

                // Verify setStreamIncrement was called with bigint version of stream ID
                expect(setStreamIncrementMock).toHaveBeenCalledWith(BigInt(streamId));

                // Verify setSeeds was called
                expect(setSeedsMock).toHaveBeenCalledWith(...getSeedsForPRNG(PRNGType.PCG));

                // CRITICAL: Verify order - setStreamIncrement must be called BEFORE setSeeds
                // This is required by PCG's initialization algorithm
                const setStreamIncrementOrder = setStreamIncrementMock.mock.invocationCallOrder[0];
                const setSeedsOrder = setSeedsMock.mock.invocationCallOrder[0];
                expect(setStreamIncrementOrder).toBeLessThan(setSeedsOrder);
            });

            it('should not call setStreamIncrement() when stream ID is null', () => {
                const gen = new RandomGenerator(PRNGType.PCG, getSeedsForPRNG(PRNGType.PCG), null);

                // Verify setStreamIncrement was not called
                expect((gen as any)._instance.setStreamIncrement).not.toHaveBeenCalled();
            });

            it('should not call setStreamIncrement() when stream ID is 0', () => {
                const gen = new RandomGenerator(PRNGType.PCG, getSeedsForPRNG(PRNGType.PCG), 0);

                // Verify setStreamIncrement was not called
                expect((gen as any)._instance.setStreamIncrement).not.toHaveBeenCalled();
            });

            it('should not call setStreamIncrement() when stream ID is negative', () => {
                const gen = new RandomGenerator(PRNGType.PCG, getSeedsForPRNG(PRNGType.PCG), -1);

                // Verify setStreamIncrement was not called
                expect((gen as any)._instance.setStreamIncrement).not.toHaveBeenCalled();
            });
        });
    });

    describe('All PRNG types', () => {
        it('should instantiate PCG', () => {
            const gen = new RandomGenerator(PRNGType.PCG, getSeedsForPRNG(PRNGType.PCG));
            expect(gen.prngType).toBe(PRNGType.PCG);
            expect(gen.seedCount).toBe(1);
        });

        it('should instantiate Xoroshiro128Plus', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus, getSeedsForPRNG(PRNGType.Xoroshiro128Plus));
            expect(gen.prngType).toBe(PRNGType.Xoroshiro128Plus);
            expect(gen.seedCount).toBe(2);
        });

        it('should instantiate Xoroshiro128Plus_SIMD', () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, getSeedsForPRNG(PRNGType.Xoroshiro128Plus_SIMD));
            expect(gen.prngType).toBe(PRNGType.Xoroshiro128Plus_SIMD);
            expect(gen.seedCount).toBe(4);
        });

        it('should instantiate Xoshiro256Plus', () => {
            const gen = new RandomGenerator(PRNGType.Xoshiro256Plus, getSeedsForPRNG(PRNGType.Xoshiro256Plus));
            expect(gen.prngType).toBe(PRNGType.Xoshiro256Plus);
            expect(gen.seedCount).toBe(4);
        });

        it('should instantiate Xoshiro256Plus_SIMD', () => {
            const gen = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, getSeedsForPRNG(PRNGType.Xoshiro256Plus_SIMD));
            expect(gen.prngType).toBe(PRNGType.Xoshiro256Plus_SIMD);
            expect(gen.seedCount).toBe(8);
        });
    });
});
