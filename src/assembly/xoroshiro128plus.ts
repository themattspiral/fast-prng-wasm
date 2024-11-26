import { number, coord, coordSquared, JUMP_128 } from './common';

let s0: u64 = 0;
let s1: u64 = 0;

export function setSeed(a: u64, b: u64): void {
    s0 = a;
    s1 = b;
    next();
};

// advances the state by 2^64 steps every call.
// can be used to generate 2^64 non-overlapping subsequences for parallel computations.
export function jump(): void {  
    let jump_s0: u64 = 0;
    let jump_s1: u64 = 0;
  
    // loop through each 64-bit value in the JUMP_128 array
    for (let i: i32 = 0; i < JUMP_128.length; i++) {
        // loop through each bit of the jump value, and if bit is 1, compute a new jump state
        for (let b: i32 = 0; b < 64; b++) {
            if ((JUMP_128[i] & (1 << b)) != 0) {
                jump_s0 ^= s0;
                jump_s1 ^= s1;
            }
            next();
        }
    }
  
    // Set the new state
    s0 = jump_s0;
    s1 = jump_s1;
}

@inline
export function next(): u64 {
    const result: u64 = s0 + s1;
    const t: u64 = s1 ^ s0;

    s0 = ((s0 << 24) | (s0 >> 40)) ^ t ^ (t << 16);
    s1 = ((t << 37) | (t >> 27));

    return result;
};

@inline
export function nextPositive(): u64 {
    return next() & 0xFFFFFFFFFFFFFFFF;
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
