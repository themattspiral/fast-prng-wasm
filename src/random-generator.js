import { PRNGType } from './prng-type.js';
import { seed64Array } from './seeds.js';

// @rollup/plugin-wasm imports these binaries as base64 strings, and provides a 
// function to synchronously compile and instantiate each WASM generator.
import PCG from '../bin/pcg.wasm';
import Xoroshiro128Plus from '../bin/xoroshiro128plus.wasm';
import Xoroshiro128Plus_SIMD from '../bin/xoroshiro128plus-simd.wasm';
import Xoshiro256Plus from '../bin/xoshiro256plus.wasm';
import Xoshiro256Plus_SIMD from '../bin/xoshiro256plus-simd.wasm';


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
     * Creates a new WASM pseudo random number generator.
     * 
     * @param {PRNGType} [prngType] The PRNG algorithm to use. Defaults to 
     * Xoroshiro128Plus_SIMD.
     * 
     * @param {bigint[]} [seeds] Collection of 64-bit integers used to seed 
     * the generator. 1-8 seeds are required depending on generator type (see
     * {@link seedCount} or API docs to determine the required seed count).
     * Auto-seeds itself if no seeds are provided.
     * 
     * @param {number | bigint} [jumpCountOrStreamIncrement] Optional unique
     * identifier to be used when sharing the same seeds across multiple
     * parallel generators (e.g. worker threads or distributed computation),
     * allowing each to choose a unique random stream.
     * 
     * For Xoshiro generators, this value indicates the number of state jumps
     * to make after seeding. For PCG generators, this value is used as the
     * internal stream increment for state advances and must be odd.
     * 
     * @param {number} [outputArraySize] Size of the output array used when 
     * filling shared memory using the `nextArray` methods. Defaults to 1000.
     */
    constructor(prngType = PRNGType.Xoroshiro128Plus_SIMD, seeds = null, jumpCountOrStreamIncrement = 0, outputArraySize = 1000) {
        this.#prngType = prngType;
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
        // to choose a stream, and have not implemented PCG state jumps.
        if (this.#instance.setStreamIncrement && jumpCountOrStreamIncrement > 0) {
            this.#instance.setStreamIncrement(BigInt(jumpCountOrStreamIncrement));
        }
    }

    /**
     * Gets the PRNG algorithm being used by this generator instance.
     * 
     * @returns The {@link PRNGType} being used by this generator instance.
     */
    get prngType() {
        return this.#prngType;
    }

    /**
     * Gets the number of `bigint`s required to seed this generator instance.
     * 
     * @returns The integer `number` of `bigint`s required to seed this generator instance.
     */
    get seedCount() {
        return this.#instance.SEED_COUNT.value;
    }

    /**
     * Gets the seed collection used to initialize this generator instance.
     * 
     * @returns The `bigint[]` seed collection used to initialize this generator instance.
     */
    get seeds() {
        return this.#seeds;
    }
    /**
     * Re-initializes the internal state of this generator instance with the given seeds.
     * 
     * @param {bigint[]} newSeeds Collection of 64-bit integers used to seed the generator.
     */
    set seeds(newSeeds) {
        this.#seeds = newSeeds;
        this.#instance.setSeed(...this.#seeds);
    }

    /**
     * Gets the size of the array returned by the `nextArray` methods.
     *
     * @returns The integer `number` of items returned by the `nextArray` methods. 
     */
    get outputArraySize() {
        return this.#outputArraySize;
    }
    /**
     * Changes the size of the array returned by the `nextArray` methods.
     *
     * @param {number} newSize The integer `number` of items to be returned by the `nextArray` methods. 
     */
    set outputArraySize(newSize) {
        if (this.#prngType !== PRNGType.MathRandom) {
            this.#instance.freeArray(this.#bigIntOutputArrayPtr);
            this.#instance.freeArray(this.#floatOutputArrayPtr);
            
            this.#outputArraySize = newSize;
            this.#setupOutputArrays(newSize);
        }
    }

    /**
     * Gets this generator's next unsigned 64-bit integer.
     * 
     * @returns {bigint} An unsigned 64-bit integer as a `bigint`,
     * providing 64-bits of randomness, between 0 and 2^64 - 1
     */
    nextBigInt() {
        // `u64` return type in WASM is treated as an `i64` and converted to a
        // signed bigint when returning to a JS runtime, so we mask it before
        // returning to ensure the value is always treated as unsigned
        return this.#instance.nextInt64() & 0xFFFFFFFFFFFFFFFFn;
    }

    /**
     * Gets this generator's next unsigned 53-bit integer.
     * 
     * @returns {number} An unsigned 53-bit integer `number` providing 53-bits of 
     * randomness (the most we can fit into a JavaScript `number` type), between
     * 0 and 2^53 - 1 (aka `Number.MAX_SAFE_INTEGER`)
     */
    nextInteger() {
        // bit-shifted and returned as an `f64` from WASM, so we get an unsigned
        // integer that fits nicely into a `number` without any more transformation
        return this.#instance.nextInt53Number();
    }

    /**
     * Gets this generator's next unsigned 32-bit integer.
     * 
     * @returns {number} An unsigned 32-bit integer `number` providing 32-bits of 
     * randomness, between 0 and 2^32 - 1
     */
    nextInteger32() {
        // bit-shifted and returned as an `f64` from WASM
        return this.#instance.nextInt32Number();
    }

    /**
     * Gets this generator's next floating point number in range [0, 1).
     * 
     * @returns {number} A floating point `number` between 0 and 1
     */
    nextNumber() {
        return this.#instance.nextNumber();
    }

    /**
     * Gets this generator's next floating point number in range (-1, 1).
     * 
     * Can be considered part of a "coordinate" in a unit circle with radius 1.
     * Useful for Monte Carlo simulation.
     * 
     * @returns {number} A floating point `number` between -1 and 1
     */
    nextCoord() {
        return this.#instance.nextCoord();
    }

    /**
     * Gets the square of this generator's next floating point number in range
     * (-1, 1).
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @returns {number} A floating point `number` between -1 and 1, multiplied
     * by itself
     */
    nextCoordSquared() {
        return this.#instance.nextCoordSquared();
    }

    /**
     * Gets this generator's next set of 64-bit integers.
     * 
     * Array size is set when generator is created, or by changing {@link outputArraySize}.
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
     * Gets this generator's next set of 53-bit integers.
     * 
     * Array size is set when generator is created, or by changing {@link outputArraySize}.
     * 
     * @returns {Float64Array} An array of 53-bit integers, represented as
     * `f64` values in WASM so they can be viewed as `number` values in
     * JavaScript. This output buffer is reused with each call.
     */
    nextArray_Integer() {
        this.#instance.fillFloat64Array_Int53Numbers(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }
    
    /**
     * Gets this generator's next set of 32-bit integers.
     * 
     * Array size is set when generator is created, or by changing {@link outputArraySize}.
     * 
     * @returns {Float64Array} An array of 32-bit integers, represented as
     * `f64` values in WASM so they can be viewed as `number` values in JS runtimes.
     * 
     * This output buffer is reused with each call.
     */
    nextArray_Integer32() {
        this.#instance.fillFloat64Array_Int32Numbers(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Gets this generator's next set of floating point numbers in range [0, 1).
     * 
     * Array size is set when generator is created, or by changing {@link outputArraySize}.
     * 
     * @returns {Float64Array} An array of `f64` values from WASM viewed as
     * `number` values in JS runtimes.
     * 
     * This output buffer is reused with each call.
     */
    nextArray_Number() {
        this.#instance.fillFloat64Array_Numbers(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }
    
    /**
     * Gets this generator's next set of Float numbers in range (-1, 1).
     * 
     * Array size is set when generator is created, or by changing {@link outputArraySize}.
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @returns {Float64Array} An array of `f64` values from WASM viewed as
     * `number` values in JS runtimes.
     * 
     * This output buffer is reused with each call.
     */
    nextArray_Coord() {
        this.#instance.fillFloat64Array_Coords(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Gets this generator's next set of squared Float numbers in range (-1, 1).
     * 
     * Array size is set when generator is created, or by changing {@link outputArraySize}.
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @returns {Float64Array} An array of `f64` values from WASM viewed as
     * `number` values in JS runtimes.
     * 
     * This output buffer is reused with each call.
     */
    nextArray_CoordSquared() {
        this.#instance.fillFloat64Array_CoordsSquared(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Performs a batch test in WASM of random (x, y) points between -1 and 1
     * and check if they fall within the corresponding unit circle with radius 1.
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @param {number} pointCount Number of random (x, y) points in (-1, 1) to generate
     * and check.
     * 
     * @returns {number} Number of tested points which fell *inside* of the
     * unit circle with radius 1.
     */
    batchTestUnitCirclePoints(pointCount) {
        return this.#instance.batchTestUnitCirclePoints(pointCount);
    } 
}
