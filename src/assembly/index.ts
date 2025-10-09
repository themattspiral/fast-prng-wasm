/**
 * PRNG AssemblyScript API - Can be used within other AssemblyScript projects.
 * 
 * > **⚠️ Thread Safety Warning ⚠️:**
 * > WASM PRNG implemetations use top-level internal state and functions to
 * > prevent the accumulation of small overhead that comes with using classes.
 * > 
 * > While they are encapsulted within namespaces so as not to interfere with
 * > your own AssemblyScript project's global namespace, this also means that
 * > they are NOT THREAD SAFE WITHIN WASM DIRECTLY.
 * > 
 * > To acheive thread safety from the JS runtime calling your AssemblyScript 
 * > WASM project binary, it must be structured in such a way as to create 
 * > separate WASM instances from JS. This is the approach used by the included
 * > JavaScript/TypeScript wrapper API.
 * @packageDocumentation
 */

// encapsulate top-level exports in namespaces for AssemblyScript consumers
// to avoid polluting the global namespace
export * as PCG from './prng/pcg';
export * as Xoroshiro128Plus from './prng/xoroshiro128plus';
export * as Xoroshiro128Plus_SIMD from './prng/xoroshiro128plus-simd';
export * as Xoshiro256Plus from './prng/xoshiro256plus';
export * as Xoshiro256Plus_SIMD from './prng/xoshiro256plus-simd';
