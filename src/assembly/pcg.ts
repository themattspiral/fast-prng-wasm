/**
 * @packageDocumentation
 * An AssemblyScript implementation of the PCG pseudo random number generator,
 * a 32-bit generator with 64 bits of state and unique stream selection.
 */

/*
 * Based on the PCG Minimal C Implementation
 * (c) 2014 M.E. O'Neill / pcg-random.org
 * https://www.pcg-random.org/download.html
 * 
 * Which is licensed under Apache License 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import { int53Number, number, coord, coordSquared } from './common';

const MULTIPLIER: u64 = 6364136223846793005;

// In PCG, the stream increment is used to provide a unique random stream.
// *Note:* This number must ALWAYS BE ODD!
let streamIncrement: u64 = 1442695040888963407;

// Internal PCG state
let state: u64 = 0;

/** Number of seed parameters required for this generator's {@link setSeed} function. */
export const SEED_COUNT: i32 = 1;

/** Initializes this generator's internal state with the provided random seed. */
export function setSeed(seed: u64): void {
    state = seed;
    nextInt32();
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
export function setStreamIncrement(inc: u64): void {
    // ensure the increment is odd regardless of value given
    streamIncrement = (inc << 1) | 1;

    // advance state
    nextInt32();
}

/**
 * Gets this generator's next unsigned 32-bit integer.
 * 
 * @returns This generator's next unsigned 32-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt32(): u32 {
    const oldState: u64 = state;

    // PCG
    state = oldState * MULTIPLIER + streamIncrement;

    // Calculate output function (XSH RR)
    const xorshifted: u32 = <u32>(((oldState >> 18) ^ oldState) >> 27);
    const rot: u32 = <u32>(oldState >>> 59);

    // 32-bit branch-free rotate right
    // note: >>> is a logical right shift, fills high bits with 0s
    return (xorshifted >>> rot) | (xorshifted << ((-rot) & 31));
}

/**
 * Gets this generator's next unsigned 64-bit integer.
 * 
 * @returns This generator's next unsigned 64-bit integer.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt64(): u64 {
    // chain the next two u32s together to get a u64
    return (<u64>nextInt32() << 32) | <u64>nextInt32();
}

/**
 * Gets this generator's next unsigned 53-bit integer.
 * 
 * @returns This generator's next unsigned 53-bit integer, returned
 * as an f64 so that the JS runtime converts it to a `Number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt53Number(): f64 {
    return int53Number(nextInt64());
}

/**
 * Gets this generator's next unsigned 32-bit integer.
 * 
 * @returns An unsigned 32-bit integer, returned as an f64 so that
 * the JS runtime converts it to a `Number`.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt32Number(): f64 {
    return <f64>nextInt32();
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


// Expose array management functions from this WASM module
export { allocUint64Array, allocFloat64Array, freeArray } from './common';


/* 
 * Perf:
 * If we extract the following mostly-repeated functions to shared logic, 
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
 * be an array pointer returned by {@link allocUint64Array}.
 */
export function fillUint64Array_Int64(arr: Uint64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt64());
    }
}

/**
 * Fills the provided array with this generator's next set of unsigned 53-bit integers.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be an array pointer returned by {@link allocFloat64Array}.
 */
export function fillFloat64Array_Int53Numbers(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt53Number());
    }
}

/**
 * Fills the provided array with this generator's next set of unsigned 32-bit integers.
 * 
 * @param arr The array to fully fill. If called from a JS runtime, this value should
 * be an array pointer returned by {@link allocFloat64Array}.
 */
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
 * be an array pointer returned by {@link allocFloat64Array}.
 */
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
 * be an array pointer returned by {@link allocFloat64Array}.
 */
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
 * be an array pointer returned by {@link allocFloat64Array}.
 */
export function fillFloat64Array_CoordsSquared(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextCoordSquared());
    }
}
