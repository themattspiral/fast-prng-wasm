import { PRNGType, PRNG, JumpablePRNG, IncrementablePRNG } from './types/prng';
import { seed64Array } from './seeds';

// @rollup/plugin-wasm imports these binaries as base64 strings, and provides a 
// function on module load to synchronously instantiate each WASM generator.
// See types/wasm.d.ts and types/prng.ts
import PCG from '../bin/pcg.wasm';
import Xoroshiro128Plus from '../bin/xoroshiro128plus.wasm';
import Xoroshiro128Plus_SIMD from '../bin/xoroshiro128plus-simd.wasm';
import Xoshiro256Plus from '../bin/xoshiro256plus.wasm';
import Xoshiro256Plus_SIMD from '../bin/xoshiro256plus-simd.wasm';

const wasmImports: WebAssembly.Imports = {
    env: {
        abort(_msg: any, _file: any, line: any, column: any) {
            console.error(`WASM abort at:${line}:${column}: `, _msg);
        },
        trace(_msg: any, _n: any, a0: any, a1: any, a2: any, a3: any) {
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

interface ArrayConfig {
    bigIntOutputArrayPtr: number;
    bigIntOutputArray: BigUint64Array;
    floatOutputArrayPtr: number;
    floatOutputArray: Float64Array;
}

/**
 * A seedable pseudo random number generator that runs in WebAssembly.
 */
export class RandomGenerator {
    private _seeds: bigint[] | null = null;
    private _prngType: PRNGType;
    private _outputArraySize: number;
    
    private _instance: PRNG;
    private _arrayConfig: ArrayConfig;
    
    private _setupOutputArrays(outputArraySize: number): ArrayConfig {
        const dataView = new DataView(this._instance.memory.buffer);

        const bigIntOutputArrayPtr = this._instance.allocUint64Array(outputArraySize);
        const bigIntOutputArray = new BigUint64Array(
            this._instance.memory.buffer,
            dataView.getUint32(bigIntOutputArrayPtr + 4, true), // array byte offset
            dataView.getUint32(bigIntOutputArrayPtr + 8, true) / BigUint64Array.BYTES_PER_ELEMENT  // array length
        );

        const floatOutputArrayPtr = this._instance.allocFloat64Array(outputArraySize);
        const floatOutputArray = new Float64Array(
            this._instance.memory.buffer,
            dataView.getUint32(floatOutputArrayPtr + 4, true), // array byte offset
            dataView.getUint32(floatOutputArrayPtr + 8, true) / Float64Array.BYTES_PER_ELEMENT  // array length
        );

        return {
            bigIntOutputArrayPtr,
            bigIntOutputArray,
            floatOutputArrayPtr,
            floatOutputArray
        };
    }

    /**
     * Creates a WASM pseudo random number generator.
     * 
     * @param prngType The PRNG algorithm to use. Defaults to 
     * Xoroshiro128Plus_SIMD.
     * 
     * @param seeds Collection of 64-bit integers used to initialize this
     * generator's internal state. 1-8 seeds are required depending on generator 
     * type (see {@link seedCount} or API docs to determine the required seed count).
     * <br><br>
     * Auto-seeds itself if no seeds are provided.
     * 
     * @param jumpCountOrStreamIncrement Determines the unique random stream
     * this generator will return within its period, given a particular starting state.
     * Values <= 0, `null`, or `undefined` will select the default stream.
     * <br><br>
     * This optional unique identifier should be used when sharing the same seeds across
     * parallel generator instances, so that each can provide a unique random stream.
     * <br><br>
     * For Xoshiro generators, this value indicates the number of state jumps
     * to make after seeding. For PCG generators, this value is used as the
     * internal stream increment for state advances.
     * 
     * @param outputArraySize Size of the output array used when 
     * filling shared memory using the `nextArray` methods.
     */
    constructor(
        prngType: PRNGType = PRNGType.Xoroshiro128Plus_SIMD,
        seeds: bigint[] | null = null,
        jumpCountOrStreamIncrement: bigint | number | null = null,
        outputArraySize: number = 1000
    ) {
        this._prngType = prngType;
        this._seeds = seeds || seed64Array();
        this._outputArraySize = outputArraySize;

        // instantiate the WASM instance and get its exported PRNG interface
        this._instance = GENERATORS[this._prngType]().exports;

        // seed count check
        const requiredSeedCount = this._instance.SEED_COUNT.value;
        if (this._seeds.length < requiredSeedCount) {
            throw new Error(`Generator type ${this._prngType} requires ${requiredSeedCount} seeds, got ${this._seeds.length}`);
        }

        // seed the generator
        this._instance.setSeeds(...this._seeds);
        
        // allocate webassembly memory for bulk array fill
        this._arrayConfig = this._setupOutputArrays(outputArraySize);

        // choose a unique random stream
        if (jumpCountOrStreamIncrement !== null && jumpCountOrStreamIncrement > 0) {
            
            // xoshiro PRNG family calls the jump function unique number of times
            // to uniquely "space out" selected stream within the generator's period
            if (this._instance.jump) {
                for (let i = 0; i < jumpCountOrStreamIncrement; i++) {
                    (<JumpablePRNG>this._instance).jump();
                }
            }

            // PCG generator family uses unique stream increment to permutate the state
            // uniquely within the generator's period
            // 
            // Note that some PCG implementations provide jump-ahead and jump-back
            // functionality as well, similar to the Xoshiro Jump function. In this
            // library's PCG implementation, we only expose the increment as a way 
            // to choose a stream, and have not implemented PCG state jumps.
            else if (this._instance.setStreamIncrement) {
                (<IncrementablePRNG>this._instance).setStreamIncrement(BigInt(jumpCountOrStreamIncrement));
            }
        }
    }

    /** Gets the PRNG algorithm being used by this generator instance. */
    get prngType(): PRNGType {
        return this._prngType;
    }

    /** Gets the number of `bigint`s required to seed this generator instance. */
    get seedCount(): number {
        return this._instance.SEED_COUNT.value || 8;
    }

    /** Gets the seed collection used to initialize this generator instance. */
    get seeds(): bigint[] {
        return this._seeds || [];
    }
    /**
     * Re-initializes the internal state of this generator instance with the given seeds.
     * 
     * @param newSeeds Collection of 64-bit integers used to seed the generator.
     */
    set seeds(newSeeds: bigint[]) {
        this._seeds = newSeeds;
        this._instance.setSeeds(...newSeeds);
    }

    /** Gets the size of the array populated by the `nextArray` methods. */
    get outputArraySize(): number {
        return this._outputArraySize;
    }
    /**
     * Changes the size of the array populated by the `nextArray` methods.
     *
     * @param newSize The count of items to be populated by the `nextArray` methods. 
     */
    set outputArraySize(newSize: number) {
        this._instance.freeArray(this._arrayConfig.bigIntOutputArrayPtr);
        this._instance.freeArray(this._arrayConfig.floatOutputArrayPtr);
        this._outputArraySize = newSize;
        this._arrayConfig = this._setupOutputArrays(newSize);
    }

    /**
     * Gets this generator's next unsigned 64-bit integer.
     * 
     * @returns An unsigned 64-bit integer,
     * providing 64-bits of randomness, between 0 and 2^64 - 1
     */
    nextBigInt(): bigint {
        // `u64` return type in WASM is treated as an `i64` and converted to a
        // signed bigint when returning to JS runtime, so we mask it before
        // returning to ensure the value is always treated as unsigned
        return this._instance.nextInt64() & 0xFFFFFFFFFFFFFFFFn;
    }

    /**
     * Gets this generator's next unsigned 53-bit integer.
     * 
     * @returns An unsigned 53-bit integer (providing the maximum randomness
     * that can fit into a JavaScript `number` type) between
     * 0 and 2^53 - 1 (aka `Number.MAX_SAFE_INTEGER`)
     */
    nextInteger(): number {
        // bit-shifted and returned as an `f64` from WASM, so we get an unsigned
        // integer that fits nicely into a `number` without any more transformation
        return this._instance.nextInt53Number();
    }

    /**
     * Gets this generator's next unsigned 32-bit integer.
     * 
     * @returns An unsigned 32-bit integer providing 32-bits of 
     * randomness, between 0 and 2^32 - 1
     */
    nextInteger32(): number {
        // bit-shifted and returned as an `f64` from WASM
        return this._instance.nextInt32Number();
    }

    /**
     * Gets this generator's next 53-bit floating point number in range [0, 1).
     * 
     * @returns A 53-bit float (providing the maximum randomness
     * that can fit into a JavaScript `number` type) between 0 and 1
     */
    nextNumber(): number {
        return this._instance.nextNumber();
    }

    /**
     * Gets this generator's next floating point number in range (-1, 1).
     * 
     * Can be considered part of a "coordinate" in a unit circle with radius 1.
     * Useful for Monte Carlo simulation.
     * 
     * @returns A 53-bit float (providing the maximum randomness
     * that can fit into a JavaScript `number` type) between -1 and 1
     */
    nextCoord(): number {
        return this._instance.nextCoord();
    }

    /**
     * Gets the square of this generator's next floating point number in range (-1, 1).
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @returns A 53-bit float (providing the maximum randomness
     * that can fit into a JavaScript `number` type) between -1 and 1,
     * multiplied by itself
     */
    nextCoordSquared(): number {
        return this._instance.nextCoordSquared();
    }

    /**
     * Fills shared memory array with this generator's next set of unsigned 64-bit integers.
     * 
     * Array size is set when generator is created or by changing {@link outputArraySize}.
     * 
     * @returns View of the WASM shared memory array for this generator, now refilled.
     * This output buffer is reused with each call.
     */
    nextArray_BigInt(): BigUint64Array {
        this._instance.fillUint64Array_Int64(this._arrayConfig.bigIntOutputArrayPtr);
        return this._arrayConfig.bigIntOutputArray;
    }
    
    /**
     * Fills shared memory array with this generator's next set of 53-bit integers.
     * 
     * Array size is set when generator is created or by changing {@link outputArraySize}.
     * 
     * @returns View of the WASM shared memory array for this generator, now refilled.
     * This output buffer is reused with each call.
     */
    nextArray_Integer(): Float64Array {
        this._instance.fillFloat64Array_Int53Numbers(this._arrayConfig.floatOutputArrayPtr);
        return this._arrayConfig.floatOutputArray;
    }
    
    /**
     * Fills shared memory array with this generator's next set of 32-bit integers.
     * 
     * Array size is set when generator is created or by changing {@link outputArraySize}.
     * 
     * @returns View of the WASM shared memory array for this generator, now refilled.
     * This output buffer is reused with each call.
     */
    nextArray_Integer32(): Float64Array {
        this._instance.fillFloat64Array_Int32Numbers(this._arrayConfig.floatOutputArrayPtr);
        return this._arrayConfig.floatOutputArray;
    }

    /**
     * Fills shared memory array with this generator's next set of floats in range [0, 1).
     * 
     * Array size is set when generator is created or by changing {@link outputArraySize}.
     * 
     * @returns View of the WASM shared memory array for this generator, now refilled.
     * This output buffer is reused with each call.
     */
    nextArray_Number(): Float64Array {
        this._instance.fillFloat64Array_Numbers(this._arrayConfig.floatOutputArrayPtr);
        return this._arrayConfig.floatOutputArray;
    }
    
    /**
     * Fills shared memory array with this generator's next set of floats in range (-1, 1).
     * 
     * Array size is set when generator is created or by changing {@link outputArraySize}.
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @returns View of the WASM shared memory array for this generator, now refilled.
     * This output buffer is reused with each call.
     */
    nextArray_Coord(): Float64Array {
        this._instance.fillFloat64Array_Coords(this._arrayConfig.floatOutputArrayPtr);
        return this._arrayConfig.floatOutputArray;
    }

    /**
     * Fills shared memory array with this generator's next set of floats in range (-1, 1)
     * that have been squared.
     * 
     * Array size is set when generator is created or by changing {@link outputArraySize}.
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @returns View of the WASM shared memory array for this generator, now refilled.
     * This output buffer is reused with each call.
     */
    nextArray_CoordSquared(): Float64Array {
        this._instance.fillFloat64Array_CoordsSquared(this._arrayConfig.floatOutputArrayPtr);
        return this._arrayConfig.floatOutputArray;
    }

    /**
     * Performs a batch test in WASM of random (x, y) points between -1 and 1
     * and checks if they fall within the corresponding unit circle with radius 1.
     * 
     * Useful for Monte Carlo simulation.
     * 
     * @param pointCount Number of random (x, y) points in (-1, 1) to generate and test.
     * 
     * @returns {number} Number of random points in (-1, 1) which fell *inside* of the
     * unit circle with radius 1.
     */
    batchTestUnitCirclePoints(pointCount: number): number {
        return this._instance.batchTestUnitCirclePoints(pointCount);
    } 
}
