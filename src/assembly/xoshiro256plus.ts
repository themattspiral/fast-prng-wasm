import { int32Number, int53Number, number, coord, coordSquared, JUMP_256 } from './common';

let s0: u64 = 0;
let s1: u64 = 0;
let s2: u64 = 0;
let s3: u64 = 0;

export const SEED_COUNT: i32 = 4;

export function setSeed(a: u64, b: u64, c: u64, d: u64): void {
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

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt64(): u64 {
    const result: u64 = s0 + s3;

    // Shift
	const t: u64 = s1 << 17;

    // XOR
	s2 ^= s0;
	s3 ^= s1;
	s1 ^= s2;
	s0 ^= s3;

	s2 ^= t;

    // Rotate: rotl(45) -> (sl 45 | sr (64-45))
    s3 = (s3 << 45) | (s3 >> 19);

	return result;
};

// No runtime function call penalty is incurred here because 
// we inline and optimize the build at compile time
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt53Number(): f64 {
    return int53Number(nextInt64());
}

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextInt32Number(): f64 {
    return int32Number(nextInt64());
}

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextNumber(): f64 {
    return number(nextInt64());
}

// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
export function nextCoord(): f64 {
    return coord(nextInt64());
}

// @ts-ignore: top level decorators are supported in AssemblyScript
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
