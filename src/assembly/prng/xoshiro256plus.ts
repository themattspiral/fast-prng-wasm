/**
 * An AssemblyScript implementation of the Xoshiro256+ pseudo random number generator,
 * a 64-bit generator with 256 bits of state (2^256 period) and a jump function for
 * unique sequence selection.
 * @packageDocumentation
*/

/*
* Based on the xoshiro256+ C reference implementation
* Public Domain, 2018 by David Blackman and Sebastiano Vigna (vigna@acm.org)
* https://prng.di.unimi.it/xoshiro256plus.c
*/

import { int32Number, int53Number, number, coord, coordSquared, JUMP_256 } from '../common/conversion';

// Expose array memory management functions for this WASM module to JS consumers
export { allocUint64Array, allocFloat64Array, freeArray } from '../common/memory';

// Internal state
let s0: u64 = 0;
let s1: u64 = 0;
let s2: u64 = 0;
let s3: u64 = 0;

/** Number of seeds required for this generator's {@link setSeeds} function. */
export const SEED_COUNT: i32 = 4;

/** Initializes this generator's internal state with the provided random seeds. */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function setSeeds(a: u64, b: u64, c: u64, d: u64): void {
    s0 = a;
    s1 = b;
    s2 = c;
    s3 = d;
    nextInt64();
};

/**
 * Advances the state by 2^128 steps every call. Can be used to generate 2^128
 * non-overlapping subsequences (with the same seed) for parallel computations.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function jump(): void {  
    let jump_s0: u64 = 0;
    let jump_s1: u64 = 0;
    let jump_s2: u64 = 0;
    let jump_s3: u64 = 0;

    // loop through each 64-bit value in the jump array
    for (let i: i32 = 0; i < JUMP_256.length; i++) {
        // loop through each bit of the jump value, and if bit is 1, compute a new jump state
        for (let b: i32 = 0; b < 64; b++) {
            if ((JUMP_256[i] & (1 << b)) != 0) {
                jump_s0 ^= s0;
                jump_s1 ^= s1;
                jump_s2 ^= s2;
                jump_s3 ^= s3;
            }
            nextInt64();
        }
    }

    // Set the new state
    s0 = jump_s0;
    s1 = jump_s1;
    s2 = jump_s2;
    s3 = jump_s3;
}

/**
 * Gets this generator's next unsigned 64-bit integer.
 * 
 * @returns This generator's next unsigned 64-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt64(): u64 {
    // output
    const result: u64 = s0 + s3;

    // Shift
    const t: u64 = s1 << 17;

    // XOR
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;

    s2 ^= t;

    // Rotate: rotl(45) == (sl 45 | sr (64-45))
    s3 = (s3 << 45) | (s3 >> 19);

    return result;
};

/**
 * Gets this generator's next unsigned 53-bit integer.
 * 
 * @returns This generator's next unsigned 53-bit integer, returned
 * as an `f64` so that the JS runtime converts it to a `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt53Number(): f64 {
    return int53Number(nextInt64());
}


/**
 * Gets this generator's next unsigned 32-bit integer.
 * 
 * @returns This generator's next unsigned 32-bit integer, returned
 * as an `f64` so that the JS runtime converts it to a `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt32Number(): f64 {
    return int32Number(nextInt64());
}

/**
 * Gets this generator's next floating point number in range [0, 1).
 * 
 * @returns A floating point number in range [0, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextNumber(): f64 {
    return number(nextInt64());
}

/**
 * Gets this generator's next floating point number in range (-1, 1).
 * 
 * Can be considered part of a "coordinate" in a unit circle with radius 1.
 * Useful for Monte Carlo simulation.
 * 
 * @returns A floating point number in range (-1, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextCoord(): f64 {
    return coord(nextInt64());
}

/**
 * Gets the square of this generator's next floating point number in range (-1, 1).
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @returns A floating point number in range (-1, 1), multiplied by itself.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextCoordSquared(): f64 {
    return coordSquared(nextInt64());
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
    let inCircle: i32 = 0;
    let xSquared: f64;
    let ySquared: f64;

    for (let i: i32 = 0; i < count; i++) {
        xSquared = nextCoordSquared();
        ySquared = nextCoordSquared();

        if (xSquared + ySquared <= 1.0) {
            inCircle++;
        }
    }

    return inCircle;
}

/**
 * Fills the provided array with this generator's next set of unsigned 64-bit integers.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillUint64Array_Int64(arr: Uint64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt64());
    }
}

/**
 * Fills the provided array with this generator's next set of unsigned 53-bit integers.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Int53Numbers(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt53Number());
    }
}

/**
 * Fills the provided array with this generator's next set of unsigned 32-bit integers.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Int32Numbers(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt32Number());
    }
}

/**
 * Fills the provided array with this generator's next set of floating point numbers
 * in range [0, 1).
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Numbers(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextNumber());
    }
}

/**
 * Fills the provided array with this generator's next set of floating point numbers
 * in range (-1, 1).
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_Coords(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextCoord());
    }
}

/**
 * Fills the provided array with the squares of this generator's next set of floating 
 * point numbers in range (-1, 1).
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function fillFloat64Array_CoordsSquared(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextCoordSquared());
    }
}
