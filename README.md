# fast-prng-wasm
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md) [![npm package version](https://img.shields.io/npm/v/fast-prng-wasm.svg?style=flat)](https://www.npmjs.com/package/fast-prng-wasm) [![CI/CD Pipeline](https://github.com/themattspiral/fast-prng-wasm/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/themattspiral/fast-prng-wasm/actions/workflows/ci-cd.yml)

A collection of fast, SIMD-enabled pseudo random number generators for [WebAssembly (WASM)](https://developer.mozilla.org/en-US/docs/WebAssembly).

This project aims to bring high-quality PRNGs to WASM by implementing modern, statistically-sound algorthms in [AssemblyScript](https://www.assemblyscript.org/), including PCG (XSH RR), Xoroshiro128+, and Xoshiro256+.

## Features:
- Simple usage from JavaScript/TypeScript
- Supports both Node and browsers (should work in any JS runtime that supports WebAssembly)
- Transparent, synchronous embedded WASM binary loading - No `fs` or `fetch` required
- Single value and bulk array-fill output functions, with 4 main return types:
  - 64-bit Integer (as `bigint`)
  - 53-bit Integer (as `number`) - e.g. the maximum number of random bits we can squeeze into a JS `number`
  - 32-bit Integer (as `number`)
  - Float (as `number`, between 0 and 1)
- Seedable PRNGs (otherwise auto-seeded)
- Unique stream selection / jump function (for shared-seed parallel generation)
- Designed to maximize generation speed, including SIMD support
- Can be used within other AssemblyScript projects as part of a larger WASM binary compilation
- Monte Carlo unit square vs unit circle test

## PRNG Algorithms:
These algorithms are supported for their high speed, execellent statistical randomness, and ability to be parallelized.

- **PCG (XSH RR):** 32-bit generator with 64 bits of state
- **Xoroshiro128+:** 64-bit generator with 128 bits of state (2<sup>128</sup> period)
- **Xoroshiro128+ (SIMD):** SIMD-enabled version provides 2 outputs for the price of 1 (using array output)
- **Xoshiro256+:** 64-bit generator with 256 bits of state (2<sup>256</sup> period)
- **Xoshiro256+ (SIMD):** SIMD-enabled version provides 2 outputs for the price of 1 (using array output)

Please Note: While these PRNG algorithms have excellent statistical properties and efficiency, they are *not cryptographically secure*. They are suitable for simulations, games, etc, but are not resilient against attacks that could reveal the sequence's history.

A detailed discussion of these algorithms, their tradeoffs, and original reference implementations can be found here:
- [PCG: A Family of Better Random Number Generators](https://www.pcg-random.org)
- [`xoshiro` / `xoroshiro` generators and the PRNG shootout](https://prng.di.unimi.it/)


## API Documentation
- **[JavaScript API Docs](docs/js-api.md)**
- **[AssemblyScript API Docs](docs/as-api.md)**


## Usage Guide

### Importing

#### ES Module `import` (bundler / modern browser / modern node)
 `import { seed64Array, PRNGType, RandomGenerator } from 'fast-prng-wasm';`

#### Node `require` (legacy node)
`const { seed64Array, PRNGType, RandomGenerator } = require('fast-prng-wasm');`

#### UMD (browser script tag)
`<script src="https://unpkg.com/fast-prng-wasm"></script>`

💡 UMD exposes the same interface in `global.fastPRNGWasm`:

`const { seed64Array, PRNGType, RandomGenerator } = fastPRNGWasm;`

### The Basics
``` js
// default PRNG type is Xoroshiro128Plus_SIMD, and auto-seeds
const gen = new RandomGenerator();
console.log(gen.nextBigInt());          // unsigned 64-bit bigint
console.log(gen.nextInteger());         // unsigned 53-bit integer number
console.log(gen.nextInteger32());       // unsigned 32-bit integer number
console.log(gen.nextNumber());          // 53-bit float number in [0, 1)

// all PRNG types expose the same interface
const pcgGen = new RandomGenerator(PRNGType.PCG);
console.log(pcgGen.nextBigInt());       // unsigned 64-bit bigint
console.log(pcgGen.nextInteger());      // unsigned 53-bit integer number
console.log(pcgGen.nextInteger32());    // unsigned 32-bit integer number
console.log(pcgGen.nextNumber());       // 53-bit float number in [0, 1)
```

The internal WASM binary will be instantiated when the new `RandomGenerator` instance is created.

### Array Output (Bulk Array Fill)
The fastest way to get random numbers *in bulk* is to use the `nextArray_*` methods of `RandomGenerator`. Each call to one of these functions fills a WASM shared memory buffer with the next 1000 (by default) random numbers, and then **returns a view** of the buffer to the JS runtime as an appropriate [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray): either `BigUint64Array` or `Float64Array`.

#### 💡 SIMD
Array functions **MUST** be used to realize the additional throughput offered by SIMD-enabled PRNG algorithms (these have higher throughput because they produce multiple random numbers at the same time).

``` js
const gen = new RandomGenerator();
const randomBigIntArray = gen.nextArray_BigInt();       // 1000 unsigned 64-bit bigints (in BigUint64Array)
const randomFloatArray = gen.nextArray_Number();        // 1000 float numbers in [0, 1) (in Float64Array)

// other types are also available for array fill
// gen.nextArray_Integer();     // 1000 unsigned 53-bit integer numbers (in Float64Array)
// gen.nextArray_Integer32();   // 1000 unsigned 32-bit integer numbers (in Float64Array)
```

#### ⚠️Shared Buffer Warning⚠️
The array returned by these funtions is actually just a `DataView` looking at a portion of shared WebAssembly memory. This shared memory buffer is **reused between calls** to the `nextArray_*` functions, so **you must actually consume (e.g. read/copy) the output between each call**.

``` js
const gen = new RandomGenerator();

// ⚠️Warning⚠️: Consume this output before making another call to nextArray_*
const randomArray1 = gen.nextArray_Number();   // 1000 floats in [0, 1)
console.log(randomArray1);                     // example consumption (extract random results)

// the values originally in randomArray1 will be replaced now! (despite using a different local variable)
const randomArray2 = gen.nextArray_Number();   // 1000 new floats in [0, 1)
console.log(randomArray2);                     // example consumption again (extract more random results)

console.log(randomArray1 === randomArray2);           // true (because they are the same shared memory array)
console.log(randomArray1[42] === randomArray2[42]);   // true (because the second call to nextArray_Number() refilled the same array memory)
```

#### Set Array Output Size
If you don't need 1000 numbers with each function call, you can specify your preferred size for the output array instead. Note that an array larger than the default of 1000 does not increase performance further in test scenarios.

``` js
// set size of output buffer to 200
//  - `null` for `seeds` param will auto-seed
//  - `null` for `jumpCountOrStreamIncrement` param will use default stream
const gen = new RandomGenerator(PRNGType.PCG, null, null, 200);
const randomArray = gen.nextArray_Number();    // 200 random floats in [0, 1)

// resize output buffer to 42
gen.outputArraySize = 42;                      // change output array size
randomArray = gen.nextArray_Number();          // 42 random floats in [0, 1)
console.log(randomArray);

// this exceeds the set memory limits of the WASM instance
gen.outputArraySize = 5000;                    // Runtime Error ⚠️
```

The AssemblyScript compiler configuration in `asconfig.release.json` specifies a fixed WASM memory size of 1 page. This is intentionally kept small to limit resources allocated to WASM instances, but is still enough space for the default of 1000 numbers.

### Seeding
Using high quality seeds is important, as summarized on Vigna's [Xoshiro page](https://prng.di.unimi.it/):
> We suggest to use [SplitMix64](https://prng.di.unimi.it/splitmix64.c) to initialize the state of our generators starting from a 64-bit seed, as [research has shown](https://dl.acm.org/citation.cfm?doid=1276927.1276928) that initialization must be performed with a generator radically different in nature from the one initialized to avoid correlation on similar seeds.

Manual seeding is optional. When no seeds are provided, a `RandomGenerator` will seed itself automatically (using the `seed64Array()` function internally).

Manual seeding is done by providing a collection of `bigint` values to initialize the internal generator state. Each generator type requires a different number of seeds (between 1 and 8). The required count for a specific PRNG is exposed via `RandomGenerator`'s `seedCount` property, as well as in the `SEED_COUNT` variable and `setSeed()` signature in the [AssemblyScript API](docs/as-api.md).
``` js
const customSeeds = [7n, 9876543210818181n];    // Xoroshiro128+ takes 2 bigint seeds
const customSeededGen = new RandomGenerator(PRNGType.Xoroshiro128Plus, customSeeds);

const anotherGen = new RandomGenerator(PRNGType.Xoshiro256Plus);
console.log(anotherGen.seedCount);              // 4
```

### Parallel Generators & Sharing Seeds
Some PRNG applications may require several (or very many) instances of a PRNG running in parallel - For example, multithreaded or distributed computing processes operating on the same problem. In these cases, it is recommended that the same set of seeds be used across ALL parallel generators *in combination with* a unique jump count or stream increment value. This essentially ensures that the randomness quality is maximized across the parallel generator instances.

#### Generate a Unique Seed Collection with `seed64Array()`
The `seed64Array()` function is provided as a means of generating your own random seeds, which can then be shared between multiple generators, e.g. each running in a different thread (see the [`pmc` demo](demo/pmc) for an example of this).

This function returns a `bigint[]` containing 8 seeds generated with SplitMix64 (which in turn was seeded with a combination of the current time and JavaScript's `Math.random()`). This collection of seeds is suitable to be provided as the `seeds` argument of any generator type in this package.

Alternatively, you may use your own custom seeds as well.

#### Choose a Unique Stream for Each Generator
Sharing seeds between generators assumes you will also provide a unique `jumpCountOrSteamIncrement` argument:
- For the PCG PRNG, this will set the internal increment value within the generator, which selects a unique random stream to be generated given a specific starting state
- For Xoshiro family PRNGs, this will advance (jump) the initial state to a unique point within the period, allowing for effectively the same behavior - choosing a random stream to be generated given a specific starting state

#### Examples
``` js
const sharedSeeds = seed64Array();    // bigint[8]

// Two PCG generators, using the same seeds but choosing unique stream increments
const pcgGen1 = new RandomGenerator(PRNGType.PCG, sharedSeeds, 17n);
const pcgNum1 = pcgGen1.nextNumber();

const pcgGen2 = new RandomGenerator(PRNGType.PCG, sharedSeeds, 12345678901234n);
const pcgNum2 = pcgGen2.nextNumber();

console.log(pcgNum1 === pcgNum2);     // false

// Two Xoshiro256+ generators using the same seeds, but with unique jumpCounts
const seededGen1 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, 1);
const num1 = seededGen1.nextNumber();

const seededGen2 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, 2);
const num2 = seededGen2.nextNumber();

console.log(num1 === num2);           // false

// Another Xoshiro256+ generator using the same seeds, and same jumpCount as seededGen2.
// Now seededGen2 and seededGen3 are effectively identical and will return the same random stream.
const seededGen3 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, 2);
const num3 = seededGen3.nextNumber();

console.log(num2 === num3);           // true: using same seeds and same jumpCount!!
```

## Compatibility
See the [WebAssembly Features Roadmap](https://webassembly.org/features/) for the latest compatibility information across various browsers and Node versions.

Note that this library makes use of the following feature extensions:
- [JS `bigint` to Wasm `i64` Integration](https://github.com/WebAssembly/JS-BigInt-integration) - Used to seed all PRNGs with `bigint`, and for `bigint` return types (to accurately represent unsigned 64-bit integers in JS runtimes)
- [Fixed-width SIMD](https://github.com/WebAssembly/simd/blob/master/proposals/simd/SIMD.md) - The SIMD-enabled PRNG Algorithms use this feature


## Demos
See the [`demo/` folder](demo/) for all available demos. Each one is treated as a separate project.
- [**`pmc` - Pi Monte Carlo:**](demo/pmc) A Monte Carlo estimation of pi (π) using a large quantity of random numbers
  - Node CLI demo app
  - Uses multiple generator instances (one per worker thread)
  - Shares a single seed set across generators
  - Uses generator jump function to select unique stream per worker


## Working With This Repo
Coming soon.

For now, see scripts in `package.json`.


## Roadmap
Planned features are listed in [TODO.md](TODO.md)
