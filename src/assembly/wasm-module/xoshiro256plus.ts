/*
 * Export the Xoshiro256+ PRNG interface globally so we can compile this file to a WASM module,
 * because AssemblyScript doesn't handle exporting namespaces.
 */

import { Xoshiro256Plus } from '../prng/xoshiro256plus';

// Expose array management functions for this WASM module to JS consumers
export { allocUint64Array, allocFloat64Array, freeArray } from '../common/memory';

// AssemblyScript compilation inlines namespaced functions, and optimization will eliminate these wrappers
export const SEED_COUNT = Xoshiro256Plus.SEED_COUNT;
export function setSeeds(a: u64, b: u64, c: u64, d: u64): void { return Xoshiro256Plus.setSeeds(a, b, c, d); }
export function jump(): void { return Xoshiro256Plus.jump(); }
export function nextInt64(): u64 { return Xoshiro256Plus.nextInt64(); }
export function nextInt53Number(): f64 { return Xoshiro256Plus.nextInt53Number(); }
export function nextInt32Number(): f64 { return Xoshiro256Plus.nextInt32Number(); }
export function nextNumber(): f64 { return Xoshiro256Plus.nextNumber(); }
export function nextCoord(): f64 { return Xoshiro256Plus.nextCoord(); }
export function nextCoordSquared(): f64 { return Xoshiro256Plus.nextCoordSquared(); }
export function fillUint64Array_Int64(arr: Uint64Array): void { return Xoshiro256Plus.fillUint64Array_Int64(arr); }
export function fillFloat64Array_Int53Numbers(arr: Float64Array): void { return Xoshiro256Plus.fillFloat64Array_Int53Numbers(arr); }
export function fillFloat64Array_Int32Numbers(arr: Float64Array): void { return Xoshiro256Plus.fillFloat64Array_Int32Numbers(arr); }
export function fillFloat64Array_Numbers(arr: Float64Array): void { return Xoshiro256Plus.fillFloat64Array_Numbers(arr); }
export function fillFloat64Array_Coords(arr: Float64Array): void { return Xoshiro256Plus.fillFloat64Array_Coords(arr); }
export function fillFloat64Array_CoordsSquared(arr: Float64Array): void { return Xoshiro256Plus.fillFloat64Array_CoordsSquared(arr); }
export function batchTestUnitCirclePoints(count: i32): i32 { return Xoshiro256Plus.batchTestUnitCirclePoints(count); }
