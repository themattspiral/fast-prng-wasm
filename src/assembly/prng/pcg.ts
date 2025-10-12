/**
 * An AssemblyScript implementation of the PCG pseudo random number generator,
 * a 32-bit generator with 64 bits of state and unique stream selection.
 * @packageDocumentation
 */

/*
* Based on the PCG Minimal C Implementation
* (c) 2014 M.E. O'Neill / pcg-random.org
* https://www.pcg-random.org/download.html
* 
* Which is licensed under Apache License 2.0
* https://www.apache.org/licenses/LICENSE-2.0
*/

import {
    uint64_to_uint53AsFloat,
    uint64_to_float53,
    uint64_to_coord53,
    uint64_to_coord53Squared
} from '../common/conversion';

// Expose array memory management functions for this WASM module to JS consumers
export { allocUint64Array, allocFloat64Array, freeArray } from '../common/memory';

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
const MULTIPLIER: u64 = 6364136223846793005;

// In PCG, the stream increment is used to provide a unique random stream.
// Note: This number must always be odd! This is enforced below.
let streamIncrement: u64 = 1442695040888963407;

// Internal PCG state
let state: u64 = 0;

/** Number of seeds required for this generator's {@link setSeeds} function. */
export const SEED_COUNT: i32 = 1;

/** Initializes this generator's internal state with the provided random seed. */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function setSeeds(seed: u64): void {
    state = seed;
    uint32();
}

/**
 * Optionally chooses the unique stream to be provided by this generator.
 * 
 * Two generators given the same seed value(s) will still provide a unique stream
 * of random numbers as long as they use different stream increments.
 *  
 * @param inc Any integer. It should be unique amongst stream increments used
 * for other parallel generator instances that have been seeded uniformly.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function setStreamIncrement(inc: u64): void {
    // ensure the increment is odd regardless of value given, in a way
    // that allows for consecutive integers and still acheives uniqueness
    streamIncrement = (inc << 1) | 1;

    // advance state
    uint32();
}

/**
 * Gets this generator's next unsigned 32-bit integer.
 * 
 * @returns This generator's next unsigned 32-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint32(): u32 {
    const oldState: u64 = state;

    // PCG
    state = oldState * MULTIPLIER + streamIncrement;

    // Calculate output function (XSH RR)
    const xorshifted: u32 = <u32>(((oldState >> 18) ^ oldState) >> 27);
    const rot: u32 = <u32>(oldState >>> 59);

    // 32-bit branch-free rotate right
    // note: >>> is a logical right shift, which fills high bits with 0s
    return (xorshifted >>> rot) | (xorshifted << ((-rot) & 31));
}

/**
 * Gets this generator's next unsigned 64-bit integer.
 * 
 * @returns This generator's next unsigned 64-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint64(): u64 {
    // chain the next two u32s together to get a `u64`
    return (<u64>uint32() << 32) | <u64>uint32();
}

/**
 * Gets this generator's next unsigned 53-bit integer.
 * 
 * @returns This generator's next unsigned 53-bit integer, returned
 * as an `f64` so that the JS runtime converts it to a `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint53AsFloat(): f64 {
    return uint64_to_uint53AsFloat(uint64());
}

/**
 * Gets this generator's next unsigned 32-bit integer.
 * 
 * @returns An unsigned 32-bit integer, returned as an `f64` so that
 * the JS runtime converts it to a `number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function uint32AsFloat(): f64 {
    return <f64>uint32();
}

/**
 * Gets this generator's next 53-bit floating point number in range [0, 1).
 * 
 * @returns A 53-bit floating point number in range [0, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function float53(): f64 {
    return uint64_to_float53(uint64());
}

/**
 * Gets this generator's next 53-bit floating point number in range [-1, 1).
 * 
 * Can be considered part of a "coordinate" in a unit circle with radius 1.
 * Useful for Monte Carlo simulation.
 * 
 * @returns A 53-bit floating point number in range [-1, 1).
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coord53(): f64 {
    return uint64_to_coord53(uint64());
}

/**
 * Gets the square of this generator's next 53-bit floating point number in range [-1, 1).
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @returns A 53-bit floating point number in range [-1, 1), multiplied by itself.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coord53Squared(): f64 {
    return uint64_to_coord53Squared(uint64());
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
 * Monte Carlo test: Generates random (x,y) coordinates in range [-1, 1), and
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
        xSquared = coord53Squared();
        ySquared = coord53Squared();

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
export function uint64Array(arr: Uint64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = uint64());
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
export function uint53AsFloatArray(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = uint53AsFloat());
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
export function uint32AsFloatArray(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = uint32AsFloat());
    }
}

/**
 * Fills the provided array with this generator's next set of 53-bit floating point numbers
 * in range [0, 1).
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function float53Array(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = float53());
    }
}

/**
 * Fills the provided array with this generator's next set of 53-bit floating point numbers
 * in range [-1, 1).
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coord53Array(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = coord53());
    }
}

/**
 * Fills the provided array with the squares of this generator's next set of floating 
 * point numbers in range [-1, 1).
 * 
 * Useful for Monte Carlo simulation.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be a pointer to an array that exists in WASM memory.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function coord53SquaredArray(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = coord53Squared());
    }
}
