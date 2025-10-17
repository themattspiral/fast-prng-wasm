/**
 * Generate a random 32-bit unsigned integer for seeding.
 *
 * Uses crypto.getRandomValues() when available (browsers and Node.js 15+)
 * for cryptographically secure random values. Falls back to combining multiple
 * entropy sources (timing + Math.random()) in older environments.
 *
 * @returns Random unsigned 32-bit integer (0 to 0xFFFFFFFF)
 */
function seed32(): number {
    // Use cryptographically secure random if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0];
    }

    // Fallback: combine multiple entropy sources for better randomness
    let entropy = Date.now();

    // Add performance.now() if available (microsecond precision gives us more bits of randomness)
    if (typeof performance !== 'undefined' && performance.now) {
        entropy ^= (performance.now() * 1000000) | 0;  // | 0 converts float to int32
    }

    // Mix in Math.random()
    entropy ^= (Math.random() * 0x100000000) | 0;  // | 0 converts float to int32

    // >>> 0 ensures unsigned 32-bit: bitwise operations produce signed int32, but seeds must be unsigned
    return entropy >>> 0;
}

/**
 * Generate a random 64-bit unsigned integer for seeding.
 *
 * Uses crypto.getRandomValues() when available for cryptographically
 * secure random values. Falls back to combining two seed32() calls
 * in older environments.
 *
 * @returns Random unsigned 64-bit integer as BigInt
 */
function seed64(): bigint {
    // Use cryptographically secure random if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint32Array(2);
        crypto.getRandomValues(arr);
        return (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
    }

    // Fallback for environments without crypto
    const high = seed32();
    const low = seed32();
    return (BigInt(high) << 32n) | BigInt(low);
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
