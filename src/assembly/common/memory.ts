/**
 * Memory Management Functions allow consumers of a WASM module from a JS runtime to interact
 * with the WASM inline memory, avoiding complex memory management from the JS side.
 * 
 * These functions are intended to be compatible with AssemblyScript's "incremental" runtime,
 * which supports garbage collection. As such, we explicitly __pin() the newly allocated array
 * so that the GC won't collect the array after returning, when WASM doesn't see it in-scope anymore.
 * (__pin() is provided by the AssemblyScript runtime)
 * 
 * The project default is to use the "stub" AssemblyScript runtime, to avoid the overhead of
 * garbage collection. In this case __pin() isn't required, but will have no effect.
 * @packageDocumentation
 */

/**
 * Allocates WASM memory for a `Uint64Array` of the given size, and pins it to
 * avoid garbage collection. Must be explicitly freed with {@link freeArray} if cleanup is needed.
 * 
 * @param count The size of the array to allocate (number of `u64`s it can hold).
 * 
 * @returns A pointer to the newly allocated array in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function allocUint64Array(count: i32): usize {
    const arr = new Uint64Array(count);
    const arrPtr: usize = changetype<usize>(arr);
    
    // @ts-ignore: it won't find __pin
    return __pin(arrPtr);
}

/**
 * Allocates WASM memory for a `Float64Array` of the given size, and pins it to
 * avoid garbage collection. Must be explicitly freed with {@link freeArray} if cleanup is needed.
 * 
 * @param count The size of the array to allocate (number of `f64`s it can hold).
 * 
 * @returns A pointer to the newly allocated array in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function allocFloat64Array(count: i32): usize {
    const arr = new Float64Array(count);
    const arrPtr: usize = changetype<usize>(arr);
    // @ts-ignore: it won't find __pin
    return __pin(arrPtr);
}

/**
 * Frees WebAssembly memory that was previously allocated by {@link allocUint64Array}
 * or {@link allocFloat64Array}.
 *
 * @param arrPtr A pointer to a previously allocated WASM memory array for cleanup.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function freeArray(arrPtr: usize): void {
    // @ts-ignore: it won't find __unpin
    // allow WASM runtime GC to free the array
    __unpin(arrPtr);
    // @ts-ignore: it won't find __free
    // explicitly free memory in stub runtime where no GC is available
    __free(arrPtr);
}
