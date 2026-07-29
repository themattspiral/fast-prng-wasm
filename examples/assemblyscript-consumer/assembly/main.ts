/**
 * assemblyscript-consumer - Using fast-prng-wasm from another AssemblyScript project
 *
 * This module imports a PRNG directly from fast-prng-wasm's AssemblyScript sources
 * and calls it in WASM with no JavaScript wrapper. It is compiled to WASM by `asc`
 * (see asconfig.json) and driven by index.js.
 */

// `fast-prng-wasm/assembly` re-exports each generator as its own namespace. Every
// generator exports the same function names (float53, uint64, ...), so the
// namespaces are what keep them from colliding. Importing it pulls in the SIMD
// generators too, so compiling requires `--enable simd` (set in asconfig.json).
import { Xoroshiro128Plus } from 'fast-prng-wasm/assembly';

// To compile only one algorithm - and, for the non-SIMD generators, without the
// SIMD flag - import that generator directly instead, e.g.:
//   import * as Xoroshiro128Plus from 'fast-prng-wasm/assembly/prng/xoroshiro128plus';

// Seed manually — seed64Array() is JavaScript-only. Xoroshiro128+ takes 2 seeds
// (SEED_COUNT differs per generator; a wrong count is a compile error). The
// explicit u64(...) form is unambiguous about the intended type — AssemblyScript
// has no BigInt `123n` literal syntax.
Xoroshiro128Plus.setSeeds(u64(0x243F6A8885A308D3), u64(0x13198A2E03707344));

/** A random 53-bit float in [0, 1). */
export function randomFloat(): f64 {
    return Xoroshiro128Plus.float53();
}

/** A random unsigned 64-bit integer (returned to JS as a bigint). */
export function randomInt(): u64 {
    return Xoroshiro128Plus.uint64();
}

/** A random 53-bit coordinate in [-1, 1). */
export function randomCoord(): f64 {
    return Xoroshiro128Plus.coord53();
}

/**
 * Estimates pi via Monte Carlo entirely in WASM, using the generator's built-in
 * unit-circle batch test — no random values cross the WASM boundary.
 */
export function estimatePi(samples: i32): f64 {
    const inside = Xoroshiro128Plus.batchTestUnitCirclePoints(samples);
    return 4.0 * (<f64>inside) / (<f64>samples);
}

/**
 * Demonstrates bulk array fill. The generator fills a typed array directly (no
 * pointer marshalling is needed when calling from AssemblyScript — that only
 * applies to the JS wrapper). A scalar sum is returned so the JS runner needs no
 * array-reading glue.
 */
export function sumRandomFloats(size: i32): f64 {
    const values = new Float64Array(size);
    Xoroshiro128Plus.float53Array(values);

    let sum: f64 = 0;
    for (let i = 0; i < values.length; i++) {
        sum += unchecked(values[i]);
    }
    return sum;
}
