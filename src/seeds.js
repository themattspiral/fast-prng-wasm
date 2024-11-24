/**
 * @module Seeds Utilites for generating random seeds that can be used to
 * initialize WASM PRNGs.
 */

function seed32() {
    return Date.now() ^ (Math.random() * 0x100000000);
}

function seed64() {
    return (BigInt(seed32()) << 32n) | BigInt(seed32());
}


/*
Adapted from: https://xoshiro.di.unimi.it/splitmix64.c
by Sebastiano Vigna (vigna@acm.org)

This is a fixed-increment version of Java 8's SplittableRandom generator
See http://dx.doi.org/10.1145/2714064.2660195 and
http://docs.oracle.com/javase/8/docs/api/java/util/SplittableRandom.html
*/

/**
 * Splitmix64 is the default pseudo-random number generator algorithm in Java.
 * It's a good generator for 64 bit seeds. This version is is included mainly
 * for seeding the other generators, but can be used independantly if desired.
 * It does not confirm to the same interface as the WASM PRNGs.
 */
export class SplitMix64 {
    constructor(seed = null) {
        this.x = seed ? BigInt(seed) : seed64();
    }

    next() {
        this.x += BigInt(0x9e3779b97f4a7c15);
        let z = this.x;
        z = (z ^ (z >> BigInt(30))) * BigInt(0xbf58476d1ce4e5b9);
        z = (z ^ (z >> BigInt(27))) * BigInt(0x94d049bb133111eb);
        return z ^ (z >> BigInt(31));
    }
}

/**
 * Generates an array of random 64-bit integers that are suitable for seeding
 * various other generators.
 * @param {number} count Number of seeds to generate
 * @param {number | bigint} seed Optional seed for the SplitMix64 generator
 * @returns {Array<bigint>} Array of unique 64-bit seeds
 */
export function seed64Array(count = 8, seed = null) {
    const sm64 = new SplitMix64(seed);
    return new Array(count).fill(0n).map(() => sm64.next());
}