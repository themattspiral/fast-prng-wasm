import { int32Number, int53Number, number, coord, coordSquared } from './common';

const MUL: u64 = 6364136223846793005;
const INC: u64 = 1442695040888963407;

let state: u64 = 0;

export function setSeed(seed: u64): void {
    state = seed;
    nextInt32();
}

/**
 * Main PCG state advancement / generator function.
 * @returns This generator's next unsigned 32-bit integer.
 */
@inline
export function nextInt32(): u32 {
    const oldState: u64 = state;

    state = oldState * MUL + INC;

    // Calculate output function (XSH RR)
    const xorshifted: u32 = <u32>(((oldState >> 18) ^ oldState) >> 27);
    const rot: u32 = <u32>(oldState >> 59);

    return (xorshifted >> rot) | (xorshifted << (-rot & 31));
}

// No runtime function call penalty is incurred by chaining these functions,
// because we inline them and optimize the build at compile time

/**
 * Chain two u32s together to get a u64.
 * @returns This generator's next unsigned 64-bit integer.
 */
@inline
export function nextInt64(): u64 {
    return (<u64>nextInt32() << 32) | <u64>nextInt32();
}

@inline
export function nextInt53Number(): f64 {
    return int53Number(nextInt64());
}

@inline
export function nextInt32Number(): f64 {
    return int32Number(nextInt64());
}

@inline
export function nextNumber(): f64 {
    return number(nextInt64());
}

@inline
export function nextCoord(): f64 {
    return coord(nextInt64());
}

@inline
export function nextCoordSquared(): f64 {
    return coordSquared(nextInt64());
}

// Expose array management functions from this module
export { allocUint64Array, allocFloat64Array, freeArray } from './common';

/*
 * If we extract the following mostly-repeated functions to shared logic, 
 * define a type for the function, and pass the generator function as a 
 * parameter, it runs somewhat slower because of runtime function call overhead
 * (At least I think, and so it can't be avoided using @inline).
 * 
 * So in the interest of speed over cleanliness, we repeat this logic in each
 * generator type.
 * 
 * The same speed caveat applies when wrapping the generators in a class:
 *  Everything slows down. So we opt instead for static functions and speed.
 */

/** Monte Carlo test: Count how many random points fall inside a unit circle */
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

/*
 * Array Fill Functions 
 */

export function fillUint64Array_Int64(arr: Uint64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt64());
    }
}

export function fillFloat64Array_Int53Numbers(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt53Number());
    }
}
export function fillFloat64Array_Int32Numbers(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextInt32Number());
    }
}

export function fillFloat64Array_Numbers(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextNumber());
    }
}

export function fillFloat64Array_Coords(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextCoord());
    }
}

export function fillFloat64Array_CoordsSquared(arr: Float64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = nextCoordSquared());
    }
}
