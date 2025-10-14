/**
 * Memory Management Functions allow consumers of a WASM module from a JS runtime to interact
 * with the WASM inline memory, avoiding complex memory management from the JS side.
 *
 * This project uses AssemblyScript's "stub" runtime, which provides a simple bump allocator
 * without garbage collection. Allocated arrays persist for the lifetime of the WASM instance.
 * This is by design for performance - the JS wrapper allocates arrays once during construction
 * and reuses them for all subsequent calls.
 *
 * @packageDocumentation
 */

/**
 * Allocates WASM memory for a `Uint64Array` of the given size.
 *
 * With the stub runtime (bump allocator), allocated arrays persist for the lifetime
 * of the WASM instance and cannot be freed. This is intentional for performance.
 *
 * @param count The size of the array to allocate (number of `u64`s it can hold).
 *
 * @returns A pointer to the newly allocated array in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function allocUint64Array(count: i32): usize {
    const arr = new Uint64Array(count);
    return changetype<usize>(arr);
}

/**
 * Allocates WASM memory for a `Float64Array` of the given size.
 *
 * With the stub runtime (bump allocator), allocated arrays persist for the lifetime
 * of the WASM instance and cannot be freed. This is intentional for performance.
 *
 * @param count The size of the array to allocate (number of `f64`s it can hold).
 *
 * @returns A pointer to the newly allocated array in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function allocFloat64Array(count: i32): usize {
    const arr = new Float64Array(count);
    return changetype<usize>(arr);
}
