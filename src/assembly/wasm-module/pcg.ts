/*
 * Export the PCG PRNG interface globally so we can compile this file to a WASM module,
 * because AssemblyScript doesn't handle exporting namespaces.
 */

import { PCG } from '../prng/pcg';

// Expose array memory management functions for this WASM module to JS consumers
export { allocUint64Array, allocFloat64Array, freeArray } from '../common/memory';

// AssemblyScript compilation inlines namespaced functions, and optimization will eliminate these wrappers
export const SEED_COUNT = PCG.SEED_COUNT;
export function setSeeds(seed: u64): void { return PCG.setSeeds(seed); }
export function setStreamIncrement(inc: u64): void { return PCG.setStreamIncrement(inc); }
export function nextInt64(): u64 { return PCG.nextInt64(); }
export function nextInt53Number(): f64 { return PCG.nextInt53Number(); }
export function nextInt32Number(): f64 { return PCG.nextInt32Number(); }
export function nextNumber(): f64 { return PCG.nextNumber(); }
export function nextCoord(): f64 { return PCG.nextCoord(); }
export function nextCoordSquared(): f64 { return PCG.nextCoordSquared(); }
export function fillUint64Array_Int64(arr: Uint64Array): void { return PCG.fillUint64Array_Int64(arr); }
export function fillFloat64Array_Int53Numbers(arr: Float64Array): void { return PCG.fillFloat64Array_Int53Numbers(arr); }
export function fillFloat64Array_Int32Numbers(arr: Float64Array): void { return PCG.fillFloat64Array_Int32Numbers(arr); }
export function fillFloat64Array_Numbers(arr: Float64Array): void { return PCG.fillFloat64Array_Numbers(arr); }
export function fillFloat64Array_Coords(arr: Float64Array): void { return PCG.fillFloat64Array_Coords(arr); }
export function fillFloat64Array_CoordsSquared(arr: Float64Array): void { return PCG.fillFloat64Array_CoordsSquared(arr); }
export function batchTestUnitCirclePoints(count: i32): i32 { return PCG.batchTestUnitCirclePoints(count); }
