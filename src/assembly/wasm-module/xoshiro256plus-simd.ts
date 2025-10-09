/*
 * Export the Xoroshiro128+ PRNG interface globally so we can compile this file to a WASM module,
 * because AssemblyScript doesn't handle exporting namespaces.
 */

import { Xoshiro256Plus_SIMD } from '../prng/xoshiro256plus-simd';

// Expose array management functions for this WASM module to JS consumers
export { allocUint64Array, allocFloat64Array, freeArray } from '../common/memory';

// AssemblyScript compilation inlines namespaced functions, and optimization will eliminate these wrappers
export const SEED_COUNT = Xoshiro256Plus_SIMD.SEED_COUNT;
export function setSeeds(a: u64, b: u64, c: u64, d: u64, e: u64, f: u64, g: u64, h: u64): void {
  return Xoshiro256Plus_SIMD.setSeeds(a, b, c, d, e, f, g, h);
}
export function jump(): void { return Xoshiro256Plus_SIMD.jump(); }
export function nextInt64(): u64 { return Xoshiro256Plus_SIMD.nextInt64(); }
export function nextInt53Number(): f64 { return Xoshiro256Plus_SIMD.nextInt53Number(); }
export function nextInt32Number(): f64 { return Xoshiro256Plus_SIMD.nextInt32Number(); }
export function nextNumber(): f64 { return Xoshiro256Plus_SIMD.nextNumber(); }
export function nextCoord(): f64 { return Xoshiro256Plus_SIMD.nextCoord(); }
export function nextCoordSquared(): f64 { return Xoshiro256Plus_SIMD.nextCoordSquared(); }
export function fillUint64Array_Int64(arr: Uint64Array): void { return Xoshiro256Plus_SIMD.fillUint64Array_Int64(arr); }
export function fillFloat64Array_Int53Numbers(arr: Float64Array): void { return Xoshiro256Plus_SIMD.fillFloat64Array_Int53Numbers(arr); }
export function fillFloat64Array_Int32Numbers(arr: Float64Array): void { return Xoshiro256Plus_SIMD.fillFloat64Array_Int32Numbers(arr); }
export function fillFloat64Array_Numbers(arr: Float64Array): void { return Xoshiro256Plus_SIMD.fillFloat64Array_Numbers(arr); }
export function fillFloat64Array_Coords(arr: Float64Array): void { return Xoshiro256Plus_SIMD.fillFloat64Array_Coords(arr); }
export function fillFloat64Array_CoordsSquared(arr: Float64Array): void { return Xoshiro256Plus_SIMD.fillFloat64Array_CoordsSquared(arr); }
export function batchTestUnitCirclePoints(count: i32): i32 { return Xoshiro256Plus_SIMD.batchTestUnitCirclePoints(count); }
