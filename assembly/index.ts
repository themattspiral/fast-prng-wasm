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

// Encapsulate top-level exports in namespaces for AssemblyScript consumers
// to avoid polluting the global namespace.
//
// This must be written as `import * as X` + `export { X }`, NOT the shorter
// `export * as X from './x'`. AssemblyScript's parser accepts only a bare
// `export * from './x'` after the asterisk (see parseExport in the compiler's
// src/parser.ts) — the `as` form is a parse error, and the flat form would
// collide, since every generator exports the same function names.
import * as PCG from './prng/pcg';
import * as Xoroshiro128Plus from './prng/xoroshiro128plus';
import * as Xoroshiro128Plus_SIMD from './prng/xoroshiro128plus-simd';
import * as Xoshiro256Plus from './prng/xoshiro256plus';
import * as Xoshiro256Plus_SIMD from './prng/xoshiro256plus-simd';

export {
    PCG,
    Xoroshiro128Plus,
    Xoroshiro128Plus_SIMD,
    Xoshiro256Plus,
    Xoshiro256Plus_SIMD
};
