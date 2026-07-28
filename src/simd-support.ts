import { PRNGType } from './types/prng';

/**
 * A minimal WebAssembly module used to detect runtime SIMD support.
 *
 * It declares a function `(param i32) (result v128)` whose body is
 * `local.get 0; i8x16.splat` (`0xfd 0x0f`). Two things make it a correct SIMD
 * gate: the function signature references the `v128` value type (`0x7b`), which
 * a runtime without the WASM SIMD proposal rejects outright, and the body uses a
 * SIMD opcode. `WebAssembly.validate()` therefore returns `true` only where SIMD
 * is available.
 *
 * The exact bytes were verified empirically (validate → `true` on a SIMD runtime);
 * the widely-quoted "one-liner" probe bytes were found to be malformed and to
 * validate `false` even where SIMD is supported.
 */
const SIMD_PROBE_MODULE = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // "\0asm", version 1
    0x01, 0x06, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7b, // type section: (i32) -> v128
    0x03, 0x02, 0x01, 0x00,                         // function section: 1 function, type 0
    0x0a, 0x08, 0x01, 0x06, 0x00,                   // code section: 1 body, 6 bytes, 0 locals
    0x20, 0x00,                                     //   local.get 0
    0xfd, 0x0f,                                     //   i8x16.splat
    0x0b                                            //   end
]);

/**
 * The SIMD PRNG algorithms mapped to their non-SIMD sibling. The two flavors of
 * an algorithm produce *different* random streams (different lane/state layout),
 * so this mapping is used to choose a fallback, never to silently substitute a
 * caller's explicit request.
 */
export const NON_SIMD_SIBLING: Partial<Record<PRNGType, PRNGType>> = {
    [PRNGType.Xoroshiro128Plus_SIMD]: PRNGType.Xoroshiro128Plus,
    [PRNGType.Xoshiro256Plus_SIMD]: PRNGType.Xoshiro256Plus
};

/**
 * Whether a PRNG algorithm requires WebAssembly SIMD to instantiate.
 */
export function isSimdType(prngType: PRNGType): boolean {
    return prngType in NON_SIMD_SIBLING;
}

/**
 * Synchronously detects whether the current runtime supports WebAssembly SIMD.
 *
 * Synchronous by design: the library's zero-config construction is synchronous,
 * so an async detector (e.g. `await simd()`) cannot be used inside the
 * `RandomGenerator` constructor. Not memoized — `WebAssembly.validate()` on a
 * ~30-byte module is negligible and construction is not a hot path, and calling
 * per-construction keeps the detector trivial to unit-test.
 *
 * @returns `true` if WASM SIMD is available, `false` otherwise (including
 * runtimes with no WebAssembly at all).
 */
export function isSimdSupported(): boolean {
    return typeof WebAssembly !== 'undefined'
        && typeof WebAssembly.validate === 'function'
        && WebAssembly.validate(SIMD_PROBE_MODULE);
}

/**
 * The environment-aware default PRNG algorithm: the SIMD flavor of the default
 * algorithm where WASM SIMD is available, otherwise its non-SIMD sibling. This
 * is what makes `new RandomGenerator()` work on every supported runtime.
 */
export function defaultPRNGType(): PRNGType {
    return isSimdSupported()
        ? PRNGType.Xoroshiro128Plus_SIMD
        : PRNGType.Xoroshiro128Plus;
}
