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
 * The JS runtime interface exposed by all WASM PRNGs in this package.
 * This is the "translated" interface that the JS runtime sees when it
 * instantiates a WASM module.
 */
export interface PRNG extends WebAssembly.Exports {
  memory: WebAssembly.Memory;

  SEED_COUNT: {
    get value(): number
  };
  setSeeds(...seeds: bigint[]): void;

  // single numbers
  uint64(): bigint;
  uint53AsFloat(): number;
  uint32AsFloat(): number;
  float53(): number;
  coord53(): number;
  coord53Squared(): number;
  
  // bulk array fill
  uint64Array(int64Array: number): void;
  uint53AsFloatArray(arrPtr: number): void;
  uint32AsFloatArray(arrPtr: number): void;
  float53Array(arrPtr: number): void;
  coord53Array(arrPtr: number): void;
  coord53SquaredArray(arrPtr: number): void;
  
  // embedded monte carlo test
  batchTestUnitCirclePoints(count: number): number;

  // WASM instance memory management
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
