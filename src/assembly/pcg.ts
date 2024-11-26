import { number, coord, coordSquared } from './common';

const MUL: u64 = 6364136223846793005;
const INC: u64 = 1442695040888963407;

let state: u64 = 0;

export function setSeed(seed: u64): void {
    state = seed;
    next32();
}

@inline
export function next32(): u32 {
    const oldState: u64 = state;

    state = oldState * MUL + INC;

    // Calculate output function (XSH RR)
    const xorshifted: u32 = <u32>(((oldState >> 18) ^ oldState) >> 27);
    const rot: u32 = <u32>(oldState >> 59);

    return (xorshifted >> rot) | (xorshifted << (-rot & 31));
}

@inline
export function next(): u64 {
    return (<u64>next32() << 32) | <u64>next32();
}

/**
 * No runtime function call penalty is incurred here because 
 * we inline and optimize the build at compile time.
 */
@inline
export function nextNumber(): f64 {
    return number(next());
}

@inline
export function nextCoord(): f64 {
    return coord(next());
}

@inline
export function nextCoordSquared(): f64 {
    return coordSquared(next());
}

/**
 * Expose array management functions from this module.
 */
export { allocUint64Array, allocFloat64Array, freeArray } from './common';

/**
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

// Monte Carlo test: Count how many random points fall inside a unit circle
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

export function fillUint64Array(arr: Uint64Array): void {
    for (let i: i32 = 0; i < arr.length; i++) {
        unchecked(arr[i] = next());
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
