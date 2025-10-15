// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export const BIT_53: f64 = 9007199254740992.0;

// used to jump xoshiro / xoroshiro state
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export const JUMP_128: StaticArray<u64> = [0xdf900294d8f554a5, 0x170865df4b3201fc];
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export const JUMP_256: StaticArray<u64> = [0x180ec6d33cfd0aba, 0xd5a61266f0c9392c, 0xa9582618e03fc9aa, 0x39abdc4529b1661c];

/**
 * Bit-shifts the given `u64` to limit it to 53 bits,
 * and casts as an `f64` so that JS runtime converts it to `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64_to_uint53AsFloat(next: u64): f64 {
    // Use >>> for unsigned/logical right shift which fills high bits with 0s
    // >> in AssemblyScript is signed/arithmetic shift
    return <f64>(next >>> 11);
}

/**
 * Bit-shifts the given `u64` to limit it to 32 bits,
 * and casts as an `f64` so that JS runtime converts it to `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64_to_uint32AsFloat(next: u64): f64 {
    // Use >>> for unsigned/logical right shift which fills high bits with 0s
    // >> in AssemblyScript is signed/arithmetic shift
    return <f64>(next >>> 32);
}

/**
 * Derives a 53-bit float in range [0, 1) from the given `u64`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64_to_float53(next: u64): f64 {
    // Use >>> for unsigned/logical right shift which fills high bits with 0s
    // >> in AssemblyScript is signed/arithmetic shift
    return <f64>(next >>> 11) / BIT_53;
}

/**
 * Derives a 53-bit float in range [-1, 1) from the given `u64`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64_to_coord53(next: u64): f64 {
    return uint64_to_float53(next) * 2.0 - 1.0;
}

/**
 * Derives the square of a 53-bit float in range [-1, 1) from the given `u64`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64_to_coord53Squared(next: u64): f64 {
    const c = uint64_to_coord53(next);
    return c * c;
}
