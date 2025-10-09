/**
 * An AssemblyScript implementation of the Xoshiro256+ pseudo random number generator,
 * a 64-bit generator with 256 bits of state (2^256 period) and a jump function for
 * unique sequence selection.
 * 
 * This version supports WebAssembly SIMD to provide 2 random outputs for the price of 1
 * when using array output functions.
 * @packageDocumentation
*/

/*
* Based on the xoshiro256+ C reference implementation
* Public Domain, 2018 by David Blackman and Sebastiano Vigna (vigna@acm.org)
* https://prng.di.unimi.it/xoshiro256plus.c
* 
* With thanks to Dennis Kawurek's WASM SIMD explainer
* https://tty4.dev/development/wasm-simd-operations/
* 
* And of course the AssemblyScript SIMD reference
* https://www.assemblyscript.org/stdlib/globals.html#simd-🦄
*/

import { int32Number, int53Number, number, coord, coordSquared, JUMP_256 } from '../common/conversion';
import { int32Numbers, int53Numbers, numbers, point, pointSquared } from '../common/conversion-simd';

// Expose array memory management functions for this WASM module to JS consumers
export { allocUint64Array, allocFloat64Array, freeArray } from '../common/memory';

// Internal state
let s0: v128 = i64x2.splat(0);
let s1: v128 = i64x2.splat(0);
let s2: v128 = i64x2.splat(0);
let s3: v128 = i64x2.splat(0);

/** Number of seeds required for this generator's {@link setSeeds} function. */
export const SEED_COUNT: i32 = 8;

/** Initializes this generator's internal state with the provided random seeds. */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function setSeeds(
    a: u64, b: u64, c: u64, d: u64,
    e: u64, f: u64, g: u64, h: u64
): void {
    s0 = i64x2(a, e);
    s1 = i64x2(b, f);
    s2 = i64x2(c, g);
    s3 = i64x2(d, h);
    nextInt64x2();
};

/**
 * Advances the state by 2^128 steps every call. Can be used to generate 2^128 
 * non-overlapping subsequences (with the same seed) for parallel computations.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function jump(): void {
    let jump_s0: v128 = i64x2.splat(0);
    let jump_s1: v128 = i64x2.splat(0);
    let jump_s2: v128 = i64x2.splat(0);
    let jump_s3: v128 = i64x2.splat(0);

    // loop through each 64-bit value in the jump array
    for (let i: i32 = 0; i < JUMP_256.length; i++) {
        // loop through each bit of the jump value, and if bit is 1, compute a new jump state
        for (let b: i32 = 0; b < 64; b++) {
            if ((JUMP_256[i] & (1 << b)) != 0) {
                jump_s0 = v128.xor(jump_s0, s0);
                jump_s1 = v128.xor(jump_s1, s1);
                jump_s2 = v128.xor(jump_s2, s2);
                jump_s3 = v128.xor(jump_s3, s3);
            }
            nextInt64x2();
        }
    }

    // Set the new state
    s0 = jump_s0;
    s1 = jump_s1;
    s2 = jump_s2;
    s3 = jump_s3;
}

/**
 * Gets this generator's next 2 unsigned 64-bit integers.
 * 
 * @returns 2 unsigned 64-bit integers.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt64x2(): v128 {
    // output
    const result: v128 = v128.add<u64>(s0, s3);

    // Shift
    // t = s1 << 17
    const t: v128 = v128.shl<u64>(s1, 17);

    // XOR
    s2 = v128.xor(s2, s0);
    s3 = v128.xor(s3, s1);
    s1 = v128.xor(s1, s2);
    s0 = v128.xor(s0, s3);

    s2 = v128.xor(s2, t);

    // Rotate: rotl(45) == (sl 45 | sr (64-45))
    s3 = v128.or(v128.shl<u64>(s3, 45), v128.shr<u64>(s3, 19));

    return result;
}

/**
 * Gets this generator's next 2 unsigned 53-bit integers.
 * 
 * @returns 2 unsigned 53-bit integers, returned as `f64`s
 * so that the JS runtime converts them to `number`s.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt53x2(): v128 {
    return int53Numbers(nextInt64x2());
}

/**
 * Gets this generator's next 2 unsigned 32-bit integers.
 * 
 * @returns 2 unsigned 32-bit integers, returned as `f64`s
 * so that the JS runtime converts them to `number`s.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt32x2(): v128 {
    return int32Numbers(nextInt64x2());
}

/**
 * Gets this generator's next 2 floating point numbers in range [0, 1).
 * 
 * @returns 2 floating point numbers in range [0, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextNumbers(): v128 {
    return numbers(nextInt64x2());
}

/**
 * Gets this generator's next 2 floating point numbers in range (-1, 1).
 * 
 * Can be considered a "coordinate" in a unit circle with radius 1.
 * Useful for Monte Carlo simulation.
 * 
 * @returns 2 floating point numbers in range (-1, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextPoint(): v128 {
    return point(nextInt64x2());
}

/**
 * Gets the square of this generator's next 2 floating point numbers in range (-1, 1).
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @returns 2 floating point numbers in range (-1, 1), each multiplied by itself.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextPointSquared(): v128 {
    return pointSquared(nextInt64x2());
}


// Single-number functions are provided for interface compatibility, but
// do not actually take advantage of parallelization achieved with SIMD


/**
 * Gets this generator's next unsigned 64-bit integer.
 * 
 * Discards the additional random number generated with SIMD.
 * 
 * @returns An unsigned 64-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt64(): u64 {
    return v128.extract_lane<u64>(nextInt64x2(), 0);
}

/**
 * Gets this generator's next unsigned 53-bit integer.
 * 
 * Discards the additional random number generated with SIMD.
 * 
 * @returns An unsigned 53-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt53Number(): f64 {
    return int53Number(nextInt64());
}

/**
 * Gets this generator's next unsigned 32-bit integer.
 * 
 * Discards the additional random number generated with SIMD.
 * 
 * @returns An unsigned 32-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt32Number(): f64 {
    return int32Number(nextInt64());
}

/**
 * Gets this generator's next floating point number in range [0, 1).
 * 
 * Discards the additional random number generated with SIMD.
 * 
 * @returns A floating point number in range [0, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextNumber(): f64 {
    return number(v128.extract_lane<u64>(nextInt64x2(), 0));
}

/**
 * Gets this generator's next floating point number in range (-1, 1).
 * 
 * Discards the additional random number generated with SIMD.
 * 
 * Can be considered part of a "coordinate" in a unit circle with radius 1.
 * Useful for Monte Carlo simulation.
 * 
 * @returns A floating point number in range (-1, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextCoord(): f64 {
    return coord(v128.extract_lane<u64>(nextInt64x2(), 0));
}

/**
 * Gets the square of this generator's next floating point number in range (-1, 1).
 * 
 * Discards the additional random number generated with SIMD.
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @returns A floating point number in range (-1, 1), multiplied by itself.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextCoordSquared(): f64 {
    return coordSquared(v128.extract_lane<u64>(nextInt64x2(), 0));
}


/* 
* Perf:
* If we extract the following mostly-repeated functions to common logic, 
* define a type for the function, and pass the generator function as a 
* parameter, it runs somewhat slower. I believe this is because of runtime
* function call overhead, and so it can't be avoided using @inline.
* 
* In the interest of speed over DRY cleanliness, we repeat this logic in each
* generator type.
* 
* The same speed caveat applies when wrapping the generator logic in a class:
* Everything slows down somewhat. So we opt instead for global functions and speed.
* 
* TODO: Add performance tradeoff examples to demos.
*/


/**
 * Monte Carlo test: Generates random (x,y) coordinates in range (-1, 1), and
 * counts how many of them fall inside the unit circle with radius 1.
 * 
 * Can be used to estimate pi (π).
 * 
 * @param count The number of random (x,y) coordinate points in (-1, 1) to generate and check.
 * 
 * @returns The number of random points which fell *inside* of the unit circle with radius 1.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function batchTestUnitCirclePoints(count: i32): i32 {
    let pointsInCircle: i32 = 0;
    let pSquared: v128;
    let xSquared: f64;
    let ySquared: f64;

    for (let i: i32 = 0; i < count; i++) {
        pSquared = nextPointSquared();
        xSquared = v128.extract_lane<f64>(pSquared, 0);
        ySquared = v128.extract_lane<f64>(pSquared, 1);
        
        if (xSquared + ySquared <= 1.0) {
            pointsInCircle++;
        }
    }

    return pointsInCircle;
}

/**
 * Fills the provided array with this generator's next set of unsigned 64-bit integers.
 * 
 * Utilizes SIMD.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillUint64Array_Int64(arr: Uint64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextInt64x2();
        unchecked(arr[i] = v128.extract_lane<u64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<u64>(rand, 1));
    }
}

/**
 * Fills the provided array with this generator's next set of unsigned 53-bit integers.
 * 
 * Utilizes SIMD.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Int53Numbers(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextInt53x2();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

/**
 * Fills the provided array with this generator's next set of unsigned 32-bit integers.
 * 
 * Utilizes SIMD.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Int32Numbers(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextInt32x2();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

/**
 * Fills the provided array with this generator's next set of floating point numbers
 * in range [0, 1).
 * 
 * Utilizes SIMD.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Numbers(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextNumbers();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

/**
 * Fills the provided array with this generator's next set of floating point numbers
 * in range (-1, 1).
 * 
 * Utilizes SIMD.
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Coords(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextPoint();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

/**
 * Fills the provided array with the squares of this generator's next set of floating 
 * point numbers in range (-1, 1).
 * 
 * Utilizes SIMD.
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_CoordsSquared(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextPointSquared();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}
