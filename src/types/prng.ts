/**
 * PRNG Algorithm Type
 */
export enum PRNGType {
    /** PCG XSH RR */
    PCG = 'PCG',
    /** Xoroshiro128+ */
    Xoroshiro128Plus = 'Xoroshiro128Plus',
    /** Xoroshiro128+ (SIMD-enabled) */
    Xoroshiro128Plus_SIMD = 'Xoroshiro128Plus_SIMD',
    /** Xoshiro256+ */
    Xoshiro256Plus = 'Xoshiro256Plus',
    /** Xoshiro256+ (SIMD-enabled) */
    Xoshiro256Plus_SIMD = 'Xoshiro256Plus_SIMD'
}

/**
 * An instance of a compiled WebAssembly module (.wasm)
 * as returned by the @rollup/plugin-wasm plugin, with
 * exports that adhere to the {@link PRNG} interface.
 * 
 * See types/wasm.d.ts
 */
export interface PRNGWasmInstance extends WebAssembly.Instance {
  exports: PRNG;
}

/**
 * The JS runtime interface exposed by
 * all WebAssembly PRNGs in this package.
 */
export interface PRNG extends WebAssembly.Exports {
  memory: WebAssembly.Memory;

  SEED_COUNT: {
    get value(): number
  };
  setSeeds(...seeds: bigint[]): void;

  nextInt32(): number;
  nextInt64(): bigint;
  nextInt53Number(): number;
  nextInt32Number(): number;
  nextNumber(): number;
  nextCoord(): number;
  nextCoordSquared(): number;

  fillUint64Array_Int64(arrPtr: number): void;
  fillFloat64Array_Int53Numbers(arrPtr: number): void;
  fillFloat64Array_Int32Numbers(arrPtr: number): void;
  fillFloat64Array_Numbers(arrPtr: number): void;
  fillFloat64Array_Coords(arrPtr: number): void;
  fillFloat64Array_CoordsSquared(arrPtr: number): void;
  
  batchTestUnitCirclePoints(count: number): number;

  allocUint64Array(count: number): number;
  allocFloat64Array(count: number): number;
  freeArray(arrPtr: number): void;
}

export interface JumpablePRNG extends PRNG {
  jump(): void;
}

export interface IncrementablePRNG extends PRNG {
  setStreamIncrement(inc: bigint): void;
}
