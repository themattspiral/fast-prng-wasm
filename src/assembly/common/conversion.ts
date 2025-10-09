// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export const BIT_53: f64 = 9007199254740992.0;

// used to jump xoshiro / xoroshiro state
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export const JUMP_128: StaticArray<u64> = [0x2bd7a6a6e99c2ddc, 0x0992ccaf6a6fca05];
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
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

/**
 * Derives an `f64` number in range [0, 1) from the given u64.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function number(next: u64): f64 {
    // note: >>> is a logical right shift , which fills high bits with 0s
    return <f64>(next >>> 11) / BIT_53;
}

/**
 * Derives an `f64` number in range (-1, 1) from the given u64.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coord(next: u64): f64 {
    return number(next) * 2.0 - 1.0;
}

/**
 * Derives the square of an `f64` number in range (-1, 1) from the given u64.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coordSquared(next: u64): f64 {
    const c = coord(next);
    return c * c;
}
