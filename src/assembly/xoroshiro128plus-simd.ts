import { int32Number, int53Number, number, coord, coordSquared, JUMP_128 } from './common';
import { int32Numbers, int53Numbers, numbers, point, pointSquared } from './common-simd';

let s0: v128 = i64x2.splat(0);
let s1: v128 = i64x2.splat(0);

export const SEED_COUNT: i32 = 4;

export function setSeed(a: u64, b: u64, c: u64, d: u64): void {
    s0 = i64x2(a, c);
    s1 = i64x2(b, d);
    nextInt64x2();
};

/**
 * Advances the state by 2^64 steps every call. Can be used to generate 2^64 
 * non-overlapping subsequences (with the same seed) for parallel computations.
 */
export function jump(): void {  
    let jump_s0: v128 = i64x2.splat(0);
    let jump_s1: v128 = i64x2.splat(0);
  
    // loop through each 64-bit value in the jump array
    for (let i: i32 = 0; i < JUMP_128.length; i++) {
        // loop through each bit of the jump value, and if bit is 1, compute a new jump state
        for (let b: i32 = 0; b < 64; b++) {
            if ((JUMP_128[i] & (1 << b)) != 0) {
                jump_s0 = v128.xor(jump_s0, s0);
                jump_s1 = v128.xor(jump_s1, s1);
            }
            nextInt64x2();
        }
    }
  
    // Set the new state
    s0 = jump_s0;
    s1 = jump_s1;
}

@inline
export function nextInt64x2(): v128 {
    const result: v128 = v128.add<u64>(s0, s1);
    const t: v128 = v128.xor(s1, s0);

    // s0 = ((s0 << 24) | (s0 >> 40)) ^ t ^ (t << 16);
    const rot = v128.or( v128.shl<u64>(s0, 24), v128.shr<u64>(s0, 40) );
    s0 = v128.xor( rot, v128.xor(t, v128.shl<u64>(t, 16)) );
    
    // s1 = ((t << 37) | (t >> 27));
    s1 = v128.or(
        v128.shl<u64>(t, 37),
        v128.shr<u64>(t, 27)
    )

    return result;
};

// No runtime function call penalty is incurred here because 
// we inline and optimize the build at compile time
@inline
export function nextInt53x2(): v128 {
    return int53Numbers(nextInt64x2());
}

@inline
export function nextInt32x2(): v128 {
    return int32Numbers(nextInt64x2());
}

@inline
export function nextNumbers(): v128 {
    return numbers(nextInt64x2());
}

@inline
export function nextPoint(): v128 {
    return point(nextInt64x2());
}

@inline
export function nextPointSquared(): v128 {
    return pointSquared(nextInt64x2());
}

// Single-number functions are provided for interface compatibility, but
// do not actually take advantage of parallelization achieved with SIMD
@inline
export function nextInt64(): u64 {
    return v128.extract_lane<u64>(nextInt64x2(), 0);
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
    return number(v128.extract_lane<u64>(nextInt64x2(), 0));
}

@inline
export function nextCoord(): f64 {
    return coord(v128.extract_lane<u64>(nextInt64x2(), 0));
}

@inline
export function nextCoordSquared(): f64 {
    return coordSquared(v128.extract_lane<u64>(nextInt64x2(), 0));
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
export function batchTestUnitCirclePoints(pointCount: i32): i32 {
    let pointsInCircle: i32 = 0;
    let pSquared: v128;
    let xSquared: f64;
    let ySquared: f64;

    for (let i: i32 = 0; i < pointCount; i++) {
        pSquared = nextPointSquared();
        xSquared = v128.extract_lane<f64>(pSquared, 0);
        ySquared = v128.extract_lane<f64>(pSquared, 1);
        
        if (xSquared + ySquared <= 1.0) {
            pointsInCircle++;
        }
    }

    return pointsInCircle;
}

export function fillUint64Array_Int64(arr: Uint64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextInt64x2();
        unchecked(arr[i] = v128.extract_lane<u64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<u64>(rand, 1));
    }
}

export function fillFloat64Array_Int53Numbers(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextInt53x2();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

export function fillFloat64Array_Int32Numbers(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextInt32x2();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

export function fillFloat64Array_Numbers(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextNumbers();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

export function fillFloat64Array_Coords(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextPoint();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}

export function fillFloat64Array_CoordsSquared(arr: Float64Array): void {
    let rand: v128;

    for (let i: i32 = 0; i < arr.length - 1; i += 2) {
        rand = nextPointSquared();
        unchecked(arr[i] = v128.extract_lane<f64>(rand, 0));
        unchecked(arr[i + 1] = v128.extract_lane<f64>(rand, 1));
    }
}
