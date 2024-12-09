function seed32() {
    return Date.now() ^ (Math.random() * 0x100000000);
}

function seed64() {
    return (BigInt(seed32()) << 32n) | BigInt(seed32());
}


/**
 * Splitmix64 is the default pseudo-random number generator algorithm in Java.
 * It's a good generator for 64 bit seeds. This version is is included for 
 * seeding the other generators.
 * 
 * Note: This PRNG runs in JS and does not confirm to the same interface 
 * as the WASM PRNGs.
 */
export class SplitMix64 {
    #state = seed64();

    constructor(seed = null) {
        if (seed) {
            this.#state = BigInt(seed);
        }
    }

    // Adapted from: https://xoshiro.di.unimi.it/splitmix64.c
    // by Sebastiano Vigna (vigna@acm.org)

    // This is a fixed-increment version of Java 8's SplittableRandom generator
    // See http://dx.doi.org/10.1145/2714064.2660195 and
    // http://docs.oracle.com/javase/8/docs/api/java/util/SplittableRandom.html
    next() {
        this.#state += BigInt(0x9e3779b97f4a7c15);
        let z = this.#state;
        z = (z ^ (z >> BigInt(30))) * BigInt(0xbf58476d1ce4e5b9);
        z = (z ^ (z >> BigInt(27))) * BigInt(0x94d049bb133111eb);
        return z ^ (z >> BigInt(31));
    }
}

/**
 * Generates an array of random 64-bit integers that are suitable for seeding
 * various other generators.
 * @param {number} [count] Optional number of seeds to generate. Defaults to 8.
 * @param {number | bigint} [seed] Optional seed for the SplitMix64 generator. 
 * Auto-seeds itself if no seed is provided.
 * @returns {Array<bigint>} Array of unique 64-bit seeds.
 */
export function seed64Array(count = 8, seed = null) {
    const sm64 = new SplitMix64(seed);
    return new Array(count).fill(0n).map(() => sm64.next());
}
