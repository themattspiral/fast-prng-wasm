import { seed64Array } from './seeds';

// @rollup/plugin-wasm imports these as base64 strings, and provides us a 
// function so that each can be compiled and loaded synchronously.
import PCG from '../bin/pcg.wasm';
import Xoroshiro128Plus from '../bin/xoroshiro128plus.wasm';
import Xoroshiro128Plus_SIMD from '../bin/xoroshiro128plus-simd.wasm';
import Xoshiro256Plus from '../bin/xoshiro256plus.wasm';
import Xoshiro256Plus_SIMD from '../bin/xoshiro256plus-simd.wasm';

/**
 * PRNG Algorithm Type
 * @enum {string}
 * */
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
     * @param {PRNGType} prngType The PRNG algorithm to use. Defaults to 
     * Xoroshiro128Plus.
     * @param {Array<bigint>} seeds Collection of 64-bit integers used to seed 
     * the generator. 1-8 seeds are required depending on generator type. 
     * Defaults to auto-seed itself if no seeds are provided.
     * @param {number} jumpCount Optional number of state jumps to make after
     * seeding, which allows the generator to choose a unique stream. Intended
     * to be used when sharing the same seeds across multiple generators in
     * parallel (e.g. worker threads). This number should be unique across 
     * generators if `seeds` are shared.
     * @param {number} outputArraySize Size of the output array used when 
     * fetching arrays from the generator. This size is pre-allocated in WASM
     * memory for performance, rather than a param in the nextArray methods.
     */
    constructor(prngType, seeds, jumpCount = 0, outputArraySize = 1000) {
        this.#prngType = prngType || PRNGType.Xoroshiro128Plus_SIMD;
        this.#seeds = seeds || seed64Array();

        // instantiate the WASM instance and get its exports
        this.#instance = GENERATORS[this.#prngType]().exports;
        
        this.#outputArraySize = outputArraySize;
        this.#setupOutputArrays(outputArraySize);
        
        this.#instance.setSeed(...this.#seeds);

        // 'Jump' the generator state by a unique count to ensure a different 
        // stream is used when the same seeds are shared across generators,
        // e.g. across multiple worker threads.
        // 
        // This approach is preferable to allowing each generator instance to 
        // generate its own random seeds, because it guarantees different 
        // streams will be used for each generator.
        //
        // Applies to the xoshiro/xoroshiro generator family.
        if (this.#instance.jump && jumpCount > 0) {
            for (let i = 0; i < jumpCount; i++) {
                this.#instance.jump();
            }
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
     * Get the generator's next 64-bit number
     * @returns {bigint} A `u64` value in WASM converted to a (signed) BigInt
     * in JS.
     */
    nextBigInt() {
        return this.#instance.next();
    }

    /**
     * Get the generator's next Float number in range [0, 1)
     * @returns {number} A Float between 0 and 1
     */
    nextNumber() {
        return this.#instance.nextNumber();
    }

    /**
     * Get the generator's next Float number in range (-1, 1). Can be viewed
     * as a "coordinate" in a unit circle. Useful for Monte Carlo simulation.
     * @returns {number} A Float between -1 and 1
     */
    nextCoord() {
        return this.#instance.nextCoord();
    }

    /**
     * Get the square of the generator's next Float number in range (-1, 1).
     * Useful for Monte Carlo simulation.
     * @returns {number} A Float between -1 and 1 multiplied by itself
     */
    nextCoordSquared() {
        return this.#instance.nextCoordSquared();
    }

    /**
     * Get the generator's next set of 64-bit numbers. Array size is set when
     * generator is created, or by changing {@link outputArraySize}.
     * @returns {Array<bigint>} An array of `u64` values in WASM converted to
     * (signed) BigInts
     */
    nextArray_BigInt() {
        this.#instance.fillUint64Array(this.#bigIntOutputArrayPtr);
        return this.#bigIntOutputArray;
    }

    /**
     * Get the generator's next set of Float numbers in range [0, 1).
     * Array size is set when generator is created, or by changing 
     * {@link outputArraySize}.
     * @returns {Array<number>}
     */
    nextArray_Numbers() {
        this.#instance.fillFloat64Array_Numbers(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }
    
    /**
     * Get the generator's next set of Float numbers in range (-1, 1).
     * Array size is set when generator is created, or by changing 
     * {@link outputArraySize}. Useful for Monte Carlo simulation.
     * @returns {Array<number>}
     */
    nextArray_Coords() {
        this.#instance.fillFloat64Array_Coords(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Get the generator's next set of squared Float numbers in range (-1, 1).
     * Array size is set when generator is created, or by changing 
     * {@link outputArraySize}. Useful for Monte Carlo simulation.
     * @returns {Array<number>}
     */
    nextArray_CoordsSquared() {
        this.#instance.fillFloat64Array_CoordsSquared(this.#floatOutputArrayPtr);
        return this.#floatOutputArray;
    }

    /**
     * Perform a batch test of random (x, y) points between -1 and 1 to see
     * if they fall within the corresponding unit circle of radius 1.
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
