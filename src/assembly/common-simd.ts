import { BIT_53 } from './common';

export const BIT_53x2: v128 = f64x2.splat(BIT_53);
export const ONEx2: v128 = f64x2.splat(1.0);
export const TWOx2: v128 = f64x2.splat(2.0);

// return 2 random 53-bit integers between 0 and 2^53 - 1,
// as f64s so that JS converts them to Numbers
@inline
export function int53Numbers(next: v128): v128 {
    // Shift right by 11 (>> 11) to extract upper 53 bits
    // of each output (highest quality randomness in upper,
    // and JS `Number` only supports 53 bit precision)
    const randShifted: v128 = v128.shr<u64>(next, 11);

    // extract bit-shifted u64s and cast to f64s
    return f64x2(
        <f64>v128.extract_lane<u64>(randShifted, 0),
        <f64>v128.extract_lane<u64>(randShifted, 1)
    );
}

// return 2 random 32-bit integers between 0 and 2^32 - 1,
// as f64s so that JS converts them to Numbers
@inline
export function int32Numbers(next: v128): v128 {
    // Shift right by 32 (>> 32) to extract upper 32 bits
    // of each output (highest quality randomness in upper)
    const randShifted: v128 = v128.shr<u64>(next, 32);

    // extract bit-shifted u64s and cast to f64s
    return f64x2(
        <f64>v128.extract_lane<u64>(randShifted, 0),
        <f64>v128.extract_lane<u64>(randShifted, 1)
    );
}

// return 2 random f64 numbers in range [0, 1)
@inline
export function numbers(next: v128): v128 {
    const randShifted: v128 = int53Numbers(next);
    
    // Scale:  number / 2^53 to get range [0, 1)
    return v128.div<f64>(randShifted, BIT_53x2);
}

// return 2 random f64 numbers in range (-1, 1)
@inline
export function point(next: v128): v128 {
    let n: v128 = numbers(next);

    // Scale:  number * 2 - 1 to get range (-1, 1)
    n = v128.mul<f64>(n, TWOx2);
    n = v128.sub<f64>(n, ONEx2);
    
    return n;
}

// return the squares of 2 random f64 numbers in range (-1, 1)
@inline
export function pointSquared(next: v128): v128 {
    const p: v128 = point(next);

    return v128.mul<f64>(p, p);
}
