import { seed64Array } from './seeds.js';

// @rollup/plugin-wasm imports these binaries as base64 strings, and provides a 
// function to synchronously compile and instantiate each WASM generator.
import PCG from '../bin/pcg.wasm';
import Xoroshiro128Plus from '../bin/xoroshiro128plus.wasm';
import Xoroshiro128Plus_SIMD from '../bin/xoroshiro128plus-simd.wasm';
import Xoshiro256Plus from '../bin/xoshiro256plus.wasm';
import Xoshiro256Plus_SIMD from '../bin/xoshiro256plus-simd.wasm';

/**
 * @enum {string} PRNG Algorithm Type
 */
export const PRNGType = {
    PCG: 'PCG',
    Xoroshiro128Plus: 'Xoroshiro128Plus',
    Xoroshiro128Plus_SIMD: 'Xoroshiro128Plus_SIMD',
    Xoshiro256Plus: 'Xoshiro256Plus',
    Xoshiro256Plus_SIMD: 'Xoshiro256Plus_SIMD'
};

const wasmImports = {
    env: {
        abort(_msg, _file, line, column) {
            console.error(`WASM abort at:${line}:${column}: `, _msg);
        },
        trace(_msg, _n, a0, a1, a2, a3) {
            console.log(`WASM trace:`, a0, a1, a2, a3);
        }
    }
};

const GENERATORS = {
    [PRNGType.PCG]: () => PCG(wasmImports),
    [PRNGType.Xoroshiro128Plus]: () => Xoroshiro128Plus(wasmImports),
    [PRNGType.Xoroshiro128Plus_SIMD]: () => Xoroshiro128Plus_SIMD(wasmImports),
    [PRNGType.Xoshiro256Plus]: () => Xoshiro256Plus(wasmImports),
    [PRNGType.Xoshiro256Plus_SIMD]: () => Xoshiro256Plus_SIMD(wasmImports)
};

/**
 * A seedable pseudo random number generator that runs in WebAssembly.
 */
export class RandomGenerator {
    #prngType = null;
    #seeds = null;
    #outputArraySize = 0;
    
    #instance = null;
    #bigIntOutputArrayPtr = null;
    #bigIntOutputArray = null;
    #floatOutputArrayPtr = null;
    #floatOutputArray = null;
    
    #setupOutputArrays = outputArraySize => {
        const dataView = new DataView(this.#instance.memory.buffer);

        this.#bigIntOutputArrayPtr = this.#instance.allocUint64Array(outputArraySize);
        this.#bigIntOutputArray = new BigUint64Array(
            this.#instance.memory.buffer,
            dataView.getUint32(this.#bigIntOutputArrayPtr + 4, true), // array byte offset
            dataView.getUint32(this.#bigIntOutputArrayPtr + 8, true) / BigUint64Array.BYTES_PER_ELEMENT  // array length
        );

        this.#floatOutputArrayPtr = this.#instance.allocFloat64Array(outputArraySize);
        this.#floatOutputArray = new Float64Array(
            this.#instance.memory.buffer,
            dataView.getUint32(this.#floatOutputArrayPtr + 4, true), // array byte offset
            dataView.getUint32(this.#floatOutputArrayPtr + 8, true) / Float64Array.BYTES_PER_ELEMENT  // array length
        );
    }

    /**
     * Creates a seedable pseudo random number generator that 
     * runs in WebAssembly.
     * 
     * @param {PRNGType} prngType The PRNG algorithm to use. Defaults to 
     * Xoroshiro128Plus.
     * 
     * @param {Array<bigint>} seeds Collection of 64-bit integers used to seed 
     * the generator. 1-8 seeds are required depending on generator type. 
     * Defaults to auto-seed itself if no seeds are provided.
     * 
     * @param {number | bigint} jumpCountOrStreamIncrement Either:
     *  - Optional number of state  jumps to make after seeding, which allows 
     * Xoshiro generators to choose a unique random stream.
     *  - Or for PCG generators, this value is set as the unique steam
     * increment used by the generator, to accomplish the same purpose
     * as the Xoshiro state jumps.
     * 
     * In both cases, this is intended to be used when sharing the same seeds 
     * across multiple generators in parallel (e.g. worker threads or
     * distributed computation environments).
     * 
     * This number should be unique across generators when `seeds` are shared.
     * 
     * @param {number} outputArraySize Size of the output array used when 
     * fetching arrays from the generator. This size is pre-allocated in WASM
     * memory for performance, rather than a param in the nextArray methods.
     */
    constructor(prngType, seeds, jumpCountOrStreamIncrement = 0, outputArraySize = 1000) {
        this.#prngType = prngType || PRNGType.Xoroshiro128Plus_SIMD;
        this.#seeds = seeds || seed64Array();

        // instantiate the WASM instance and get its exports
        this.#instance = GENERATORS[this.#prngType]().exports;
        
        this.#outputArraySize = outputArraySize;
        this.#setupOutputArrays(outputArraySize);
        
        const requiredSeedCount = this.#instance.SEED_COUNT.value;
        if (this.#seeds.length < requiredSeedCount) {
            throw new Error(`Generator type ${this.#prngType} requires ${requiredSeedCount} seeds, got ${this.#seeds.length}`);
        }

        this.#instance.setSeed(...this.#seeds);

        // 'Jump' the generator state by a unique count to ensure a different 
        // stream is used when the same seeds are shared across generators,
        // e.g. across multiple worker threads.
        //
        // Applies to the xoshiro/xoroshiro generator family
        if (this.#instance.jump && jumpCountOrStreamIncrement > 0) {
            for (let i = 0; i < jumpCountOrStreamIncrement; i++) {
                this.#instance.jump();
            }
        }

        // Set a unique stream increment to ensure a different 
        // stream is used when the same seeds are shared across generators,
        // e.g. across multiple worker threads.
        //
        // Applies to the PCG generator family.
        // 
        // Note that some PCG implementations provide jump-ahead and jump-back
        // functionality as well, similar to the Xoshiro Jump function. In this
        // library's PCG implementation, we only expose the increment as a way 
        // to choose a stream, and haven't implemented PCG state jumps.
        if (this.#instance.setStreamIncrement && jumpCountOrStreamIncrement > 0) {
            this.#instance.setStreamIncrement(BigInt(jumpCountOrStreamIncrement));
        }
    }

    get prngType() {
        return this.#prngType;
    }

    get seeds() {
        return this.#seeds;
    }
    set seeds(newSeeds) {
        if (prngType !== PRNGType.MathRandom) {
            this.#seeds = newSeeds;
            this.#instance.setSeed(...this.#seeds);
        }
    }

    /** The size of the array returned by the `nextArray` methods. */
    get outputArraySize() {
        return this.#outputArraySize;
    }
    set outputArraySize(newSize) {
        if (this.#prngType !== PRNGType.MathRandom) {
            this.#instance.freeArray(this.#bigIntOutputArrayPtr);
            this.#instance.freeArray(this.#floatOutputArrayPtr);
            
            this.#outputArraySize = newSize;
            this.#setupOutputArrays(newSize);
        }
    }

    /**
     * Get the generator's next unsigned 64-bit integer
     * 
     * @returns {bigint} An unsigned `bigint` providing 64-bits of randomness,
     * between 0 and 2^64 - 1
     */
    nextBigInt() {
        // `u64` return type in WASM is treated as an `i64` and converted to a
        // signed BigInt in JS, so we mask it before returning to ensure the 
        // value is treated as unsigned
        return this.#instance.nextInt64() & 0xFFFFFFFFFFFFFFFFn;
    }

    /**
     * Get the generator's next unsigned 53-bit integer
     * 
     * @returns {number} An unsigned integer `number` providing 53-bits of 
     * randomness (the most we can fit into a JavaScript `number`), between
     * 0 and 2^53 - 1 (`Number.MAX_SAFE_INTEGER`)
     */
    nextInteger() {
        // bit-shifted and returned as an f64 from WASM, so we get an unsigned
        // integer that fits nicely into a `number` without any more transformation
        return this.#instance.nextInt53Number();
    }

    /**
     * Get the generator's next unsigned 32-bit integer
     * @returns {number} An unsigned integer `number` providing 32-bits of 
     * randomness, between 0 and 2^32 - 1
     */
    nextInteger32() {
        // bit-shifted and returned as an f64 from WASM, so we get an unsigned
        // integer that fits nicely into a `number` without any more transformation
        return this.#instance.nextInt32Number();
    }

    /**
     * Get the generator's next floating point number in range [0, 1)
     * 
     * @returns {number} A floating point `number` between 0 and 1
     */
    nextNumber() {
        return this.#instance.nextNumber();
    }

    /**
     * Get the generator's next floating point number in range (-1, 1).
     * Can be considered a "coordinate" in a unit circle. Useful for Monte
     * Carlo simulation.
     * 
     * @returns {number} A floating point `number` between -1 and 1
     */
    nextCoord() {
        return this.#instance.nextCoord();
    }

    /**
     * Get the square of the generator's next floating point number in range
     * (-1, 1). Useful for Monte Carlo simulation.
     * 
     * @returns {number} A floating point `number` between -1 and 1, multiplied
     * by itself
     */
    nextCoordSquared() {
        return this.#instance.nextCoordSquared();
    }

    /**
     * Get the generator's next set of 64-bit integers between
     * 0 and 2^64 - 1. Array size is set when generator is created, 
     * or by changing {@link outputArraySize}.
     * 
     * @returns {BigUint64Array} An array of 64-bit integers, represented as 
     * `u64` values in WASM and viewed as unsigned `bigint` values in
     * JavaScript. This output buffer is reused with each call.
     */
    nextArray_BigInt() {
        this.#instance.fillUint64Array_Int64(this.#bigIntOutputArrayPtr);
        return this.#bigIntOutputArray;
    }
    
    /**
     * Get the generator's next set of 53-bit integers between
     * 0 and 2^53 - 1 (i.e. `Number.MAX_SAFE_INTEGER`). Array size is set
     * when generator is created, or by changing {@link outputArraySize}.
     * @returns {Float64Array} An array of 53-bit integers, represented as
     * `f64` values in WASM so they can be viewed as `number` values in
     * JavaScript. This output buffer is reused with each call.
     */
    nextArray_Integer() {
        this.#instance.fillFloat64Array_Int53Numbers(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }
    
    /**
     * Get the generator's next set of 32-bit integers between
     * 0 and 2^32 - 1. Array size is set when generator is created, 
     * or by changing {@link outputArraySize}.
     * @returns {Float64Array} An array of 32-bit integers, represented as
     * `f64` values in WASM so they can be viewed as `number` values in
     * JavaScript. This output buffer is reused with each call.
     */
    nextArray_Integer32() {
        this.#instance.fillFloat64Array_Int32Numbers(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Get the generator's next set of floating point numbers in range [0, 1).
     * Array size is set when generator is created, or by changing 
     * {@link outputArraySize}.
     * @returns {Float64Array} An array of `f64` values in WASM viewed as
     * `number` values. This output buffer is reused with each call.
     */
    nextArray_Number() {
        this.#instance.fillFloat64Array_Numbers(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }
    
    /**
     * Get the generator's next set of Float numbers in range (-1, 1).
     * Array size is set when generator is created, or by changing 
     * {@link outputArraySize}. Useful for Monte Carlo simulation.
     * @returns {Float64Array} An array of `f64` values in WASM viewed as
     * `number` values. This output buffer is reused with each call.
     */
    nextArray_Coord() {
        this.#instance.fillFloat64Array_Coords(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Get the generator's next set of squared Float numbers in range (-1, 1).
     * Array size is set when generator is created, or by changing 
     * {@link outputArraySize}. Useful for Monte Carlo simulation.
     * @returns {Float64Array} An array of `f64` values in WASM viewed as
     * `number` values. This output buffer is reused with each call.
     */
    nextArray_CoordSquared() {
        this.#instance.fillFloat64Array_CoordsSquared(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Perform a batch test in WASM of random (x, y) points between -1 and 1
     * and check if they fall within the corresponding unit circle of radius 1.
     * Useful for Monte Carlo simulation.
     * @param {number} pointCount Number of random (x, y) points to generate
     * and test
     * @returns {number} Number of tested points which fall inside of the
     * unit circle.
     */
    batchTestUnitCirclePoints(pointCount) {
        return this.#instance.batchTestUnitCirclePoints(pointCount);
    } 
}
