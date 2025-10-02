export const BIT_53: f64 = 9007199254740992.0;

export const JUMP_128: StaticArray<u64> = [0x2bd7a6a6e99c2ddc, 0x0992ccaf6a6fca05];
export const JUMP_256: StaticArray<u64> = [0x180ec6d33cfd0aba, 0xd5a61266f0c9392c, 0xa9582618e03fc9aa, 0x39abdc4529b1661c];

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
// return a random 53-bit integer between 0 and 2^53 - 1
// as an f64 so that JS converts it to Number
export function int53Number(next: u64): f64 {
    return <f64>(next >> 11);
}

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
// return a random 32-bit integer between 0 and 2^32 - 1
// as an f64 so that JS converts it to Number
export function int32Number(next: u64): f64 {
    return <f64>(next >> 32);
}

// return a random f64 number in range [0, 1)
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function number(next: u64): f64 {
    return <f64>(next >> 11) / BIT_53;
}

// return a random f64 number in range (-1, 1)
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coord(next: u64): f64 {
    return number(next) * 2.0 - 1.0;
}

// return the square of a random f64 number in range (-1, 1)
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coordSquared(next: u64): f64 {
    const c = coord(next);
    return c * c;
}

/*
 * These functions are compatible with AssemblyScript's "incremental" runtime,
 * and explicitly __pin() the newly allocated array so that the built-in GC 
 * won't collect the array when WASM doesn't see it in-scope after returning.
 * 
 * If using a WASM runtime that doesn't garbage collect, eg. project-default "stub",
 * then __pin isn't required, but will have no effect, so it's safe to call.
 */

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function allocUint64Array(count: i32): usize {
    const arr = new Uint64Array(count);
    const arrPtr: usize = changetype<usize>(arr);
    
    // @ts-ignore: it won't find __pin
    return __pin(arrPtr);
}

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function allocFloat64Array(count: i32): usize {
    const arr = new Float64Array(count);
    const arrPtr: usize = changetype<usize>(arr);
    // @ts-ignore: it won't find __pin
    return __pin(arrPtr);
}

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function freeArray(arrPtr: usize): void {
    // @ts-ignore: it won't find __unpin
    __unpin(arrPtr);
}
