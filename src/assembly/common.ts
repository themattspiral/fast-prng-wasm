export const BIT_53: f64 = 9007199254740992.0;

export const JUMP_128: StaticArray<u64> = [0x2bd7a6a6e99c2ddc, 0x0992ccaf6a6fca05];
export const JUMP_256: StaticArray<u64> = [0x180ec6d33cfd0aba, 0xd5a61266f0c9392c, 0xa9582618e03fc9aa, 0x39abdc4529b1661c];

/**
 * Bit-shifts the given u64 to limit it to 53 bits,
 * and casts as an `f64` so that JS runtime converts it to `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function int53Number(next: u64): f64 {
    // note: >>> is a logical right shift, which fills high bits with 0s
    return <f64>(next >>> 11);
}

/**
 * Bit-shifts the given u64 to limit it to 32 bits,
 * and casts as an `f64` so that JS runtime converts it to `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function int32Number(next: u64): f64 {
    // note: >>> is a logical right shift, which fills high bits with 0s
    return <f64>(next >>> 32);
}

/*
 * Derives an `f64` number in range [0, 1) from the given u64.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function number(next: u64): f64 {
    // note: >>> is a logical right shift , which fills high bits with 0s
    return <f64>(next >>> 11) / BIT_53;
}

/*
 * Derives an `f64` number in range (-1, 1) from the given u64.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coord(next: u64): f64 {
    return number(next) * 2.0 - 1.0;
}

/*
 * Derives the square of an `f64` number in range (-1, 1) from the given u64.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coordSquared(next: u64): f64 {
    const c = coord(next);
    return c * c;
}

/*
 * Perf:
 * These functions are intended to be compatible with AssemblyScript's "incremental" runtime,
 * which does garbage collection. As such, we explicitly __pin() the newly allocated array
 * so that the built-in GC won't collect the array when WASM doesn't see it in-scope after returning.
 * (__pin() is provided by the AssemblyScript runtime)
 * 
 * The project default is to use the "stub" AssemblyScript runtime, to avoid the overhead of
 * garbage collection. In this case __pin() isn't required, but will have no effect.
 */

/**
 * Allocates shared WebAssembly memory for a `Uint64Array` of the given size, and pins it to
 * avoid garbage collection. Must be explicitly freed with {@link freeArray} if cleanup is needed.
 * 
 * @param count The size of the array to allocate (number of `u64`s it can hold).
 * 
 * @returns A pointer to the newly allocated shared-memory array, which can be used from JS runtimes.
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
 * Allocates shared WebAssembly memory for a `Float64Array` of the given size, and pins it to
 * avoid garbage collection. Must be explicitly freed with {@link freeArray} if cleanup is needed.
 * 
 * @param count The size of the array to allocate (number of `f64`s it can hold).
 * 
 * @returns A pointer to the newly allocated shared-memory array, which can be used from JS runtimes.
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
 * Frees shared WebAssembly memory that was previously allocated by {@link allocUint64Array} 
 * or {@link allocFloat64Array}.
 * 
 * @param arrPtr A pointer to the previously allocated shared-memory array to cleanup.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function freeArray(arrPtr: usize): void {
    // @ts-ignore: it won't find __unpin
    __unpin(arrPtr);
}
