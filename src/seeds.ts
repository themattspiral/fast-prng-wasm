function seed32(): number {
    return Date.now() ^ (Math.random() * 0x100000000);
}

function seed64(): bigint {
    return (BigInt(seed32()) << 32n) | BigInt(seed32());
}


/**
 * Splitmix64 is the default pseudo random number generator algorithm in Java.
 * It's a good generator for 64 bit seeds, and is is included for seeding
 * the other generators within this library.
 */
export class SplitMix64 {
    _state: bigint;

    constructor(seed: number | bigint | null = null) {
        if (seed !== null && seed !== undefined) {
            this._state = BigInt(seed);
        } else {
            this._state = seed64();
        }
    }

    /*
     * Adapted from: https://xoshiro.di.unimi.it/splitmix64.c
     * by Sebastiano Vigna (vigna@acm.org)
     *
     * This is a fixed-increment version of Java 8's SplittableRandom generator
     * See http://dx.doi.org/10.1145/2714064.2660195 and
     * http://docs.oracle.com/javase/8/docs/api/java/util/SplittableRandom.html
     *
     * Note: BigInt arithmetic in JS doesn't automatically wrap at 64 bits like uint64_t in C.
     * We mask intermediate results to ensure proper 64-bit behavior.
     */
    next(): bigint {
        this._state = (this._state + 0x9e3779b97f4a7c15n) & 0xFFFFFFFFFFFFFFFFn;
        let z = this._state;
        z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xFFFFFFFFFFFFFFFFn;
        z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xFFFFFFFFFFFFFFFFn;
        return z ^ (z >> 31n);
    }
}

/**
 * Generates an array of random 64-bit integers suitable for seeding
 * the other generators in this library.
 * 
 * @param count Number of random seeds to generate.
 * 
 * @param seed Seed for SplitMix64 generator initialization. If not provided,
 * will auto-seed using a combination of the current time and Math.random().
 * 
 * @returns Array of unique 64-bit seeds.
 */
export function seed64Array(count = 8, seed: number | bigint | null = null): bigint[] {
    const sm64 = new SplitMix64(seed);
    return new Array(count).fill(0n).map(() => sm64.next());
}
