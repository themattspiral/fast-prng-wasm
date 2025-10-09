/**
 * PRNG AssemblyScript API - Can be used within other AssemblyScript projects.
 * 
 * > **⚠️ Thread Safety Warning ⚠️:**
 * > These PRNG implemetations use top-level internal state and functions to
 * > prevent the accumulation of small overhead that comes with using classes.
 * > 
 * > While they are encapsulted within namespaces so as not to interfere with
 * > your own AssemblyScript project's global namespace, this also means that
 * > they are NOT THREAD SAFE WITHIN WASM DIRECTLY.
 * > 
 * > To acheive thread safety from the JS runtime calling your project, it must be
 * > structured in such a way as to create separate WASM instances. This is the
 * > approach used by the included JavaScript/TypeScript wrapper API.
 * @packageDocumentation
 */

export * from './prng/pcg';
export * from './prng/xoroshiro128plus';
export * from './prng/xoroshiro128plus-simd';
export * from './prng/xoshiro256plus';
export * from './prng/xoshiro256plus-simd';
