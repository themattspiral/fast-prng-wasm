import { BIT_53 } from './conversion';

export const BIT_53x2: v128 = f64x2.splat(BIT_53);
export const ONEx2: v128 = f64x2.splat(1.0);
export const TWOx2: v128 = f64x2.splat(2.0);

/**
 * Bit-shifts the given `u64`s to limit them to 53 bits,
 * and casts as `f64`s so that JS runtime converts them to `number`s.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64x2_to_uint53AsFloatx2(next: v128): v128 {
    // Shift right by 11 (>> 11) to extract upper 53 bits
    // of each output (highest quality randomness in upper,
    // and JS `number` only supports 53 bit precision)
    const randShifted: v128 = v128.shr<u64>(next, 11);

    // extract bit-shifted `u64`s and cast to `f64`s
    return f64x2(
        <f64>v128.extract_lane<u64>(randShifted, 0),
        <f64>v128.extract_lane<u64>(randShifted, 1)
    );
}

/**
 * Bit-shifts the given `u64`s to limit them to 32 bits,
 * and casts as `f64`s so that JS runtime converts them to `number`s.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64x2_to_uint32AsFloatx2(next: v128): v128 {
    // Shift right by 32 (>> 32) to extract upper 32 bits
    // of each output (highest quality randomness in upper)
    const randShifted: v128 = v128.shr<u64>(next, 32);

    // extract bit-shifted `u64`s and cast to `f64`s
    return f64x2(
        <f64>v128.extract_lane<u64>(randShifted, 0),
        <f64>v128.extract_lane<u64>(randShifted, 1)
    );
}

/**
 * Derives 2 `f64`s in range [0, 1) from the 2 given `u64`s.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64x2_to_float53x2(next: v128): v128 {
    const randShifted: v128 = uint64x2_to_uint53AsFloatx2(next);
    
    // Scale:  number / 2^53 to get range [0, 1)
    return v128.div<f64>(randShifted, BIT_53x2);
}

/**
 * Derives 2 `f64`s in range [-1, 1) from the 2 given `u64`s.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64x2_to_coord53x2(next: v128): v128 {
    let n: v128 = uint64x2_to_float53x2(next);

    // Scale:  number * 2 - 1 to get range [-1, 1)
    n = v128.mul<f64>(n, TWOx2);
    n = v128.sub<f64>(n, ONEx2);

    return n;
}

/**
 * Derives the squares of 2 `f64`s in range [-1, 1) from the 2 given `u64`s.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64x2_to_coord53Squaredx2(next: v128): v128 {
    const p: v128 = uint64x2_to_coord53x2(next);

    return v128.mul<f64>(p, p);
}
