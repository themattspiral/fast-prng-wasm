# fast-prng-wasm
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md) [![npm version](https://img.shields.io/npm/v/fast-prng-wasm.svg?style=flat)](https://www.npmjs.com/package/fast-prng-wasm)

A collection of fast, SIMD-enabled pseudo random number generators that run in [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly).

### Features:
- Simple usage from JavaScript
- Supports both Node and browsers
- Transparent, synchronous WASM loading (embedded binaries - no `fs` or `fetch` required)
- Seedable (or self/auto-seeded)
- Unique stream selection (for shared-seed parallel generation)
- Single value and bulk array output functions
- Float (as `Number`), Integer (as `Number`), 32-bit Integer (as `Number`), and 64-bit `BigInt` output types
- Designed for speed - [WASM SIMD](https://github.com/WebAssembly/simd/blob/master/proposals/simd/SIMD.md) versions allow higher throughput
- PRNGs can also be imported to other [AssemblyScript](https://www.assemblyscript.org/) projects and used as part of a larger WASM compilation

### PRNG Algorithms:
- **PCG XSH RR:** 32-bit generator with 64 bits of state
- **Xoroshiro128+:** 64-bit generator with 128 bits of state (2<sup>128</sup> period)
- **Xoroshiro128+ (SIMD):** A SIMD-enabled version of above; provides 2 random outputs for the price of 1
- **Xoshiro256+:** 64-bit generator with 256 bits of state (2<sup>256</sup> period)
- **Xoshiro256+ (SIMD):** SIMD-enabled version of above; provides 2 random outputs for the price of 1

#### Further PRNG Reading:
- [PCG: A Family of Better Random Number Generators](https://www.pcg-random.org)
- [`xoshiro` / `xoroshiro` generators and the PRNG shootout](https://prng.di.unimi.it/)


## Usage

### ES Module `import` (bundler / modern browser / modern node)
 `import { seed64Array, PRNGType, RandomGenerator } from 'fast-prng-wasm';`

### Node `require` (legacy node)
`const { seed64Array, PRNGType, RandomGenerator } = require('fast-prng-wasm');`

### UMD (browser)
`<script src="https://unpkg.com/fast-prng-wasm"></script>`

💡 UMD exposes the same interface in `global.fastPRNGWasm`:

`const { seed64Array, PRNGType, RandomGenerator } = fastPRNGWasm;`

### Basics
``` js
// default PRNG type is Xoroshiro128Plus_SIMD, and self-seeds
const gen = new RandomGenerator();
console.log(gen.nextBigInt());          // unsigned 64-bit BigInt
console.log(gen.nextInteger());         // unsigned 53-bit integer Number
console.log(gen.nextInteger32());       // unsigned 32-bit integer Number
console.log(gen.nextNumber());          // 53-bit float Number in [0, 1)

// all PRNG types expose the same interface
const pcgGen = new RandomGenerator(PRNGType.PCG);
console.log(pcgGen.nextBigInt());       // unsigned 64-bit BigInt
console.log(pcgGen.nextInteger());      // unsigned 53-bit integer Number
console.log(pcgGen.nextInteger32());    // unsigned 32-bit integer Number
console.log(pcgGen.nextNumber());       // 53-bit float Number in [0, 1)
```

### Array Output

The fastest way to get random numbers *in bulk* is to use the `nextArray_*` methods of `RandomGenerator`. Each call to one of these functions fills an internal buffer with the next 1000 (by default) random numbers, and then **returns a view** of the buffer to JavaScript as an appropriate [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), either `BigUint64Array` or `Float64Array`.

#### 💡 SIMD
Array functions must be used instead of single-value functions to get the additional throughput offered by SIMD algorithm types (these have higher throughput because they produce multiple numbers at the same time).

``` js
const gen = new RandomGenerator();
const randomArray = gen.nextArray_BigInt();       // 1000 unsigned 64-bit BigInts (in BigUint64Array)
const randomArray2 = gen.nextArray_Integer();     // 1000 unsigned 53-bit integer Numbers (in Float64Array)
const randomArray3 = gen.nextArray_Integer32();   // 1000 unsigned 32-bit integer Numbers (in Float64Array)
const randomArray4 = gen.nextArray_Number();      // 1000 float Numbers in [0, 1) (in Float64Array)
```

#### ⚠️Shared Buffer Warning⚠️
Because you are consuming random numbers out of a view on a portion of shared WebAssembly memory, and this *memory is reused between calls* to the `nextArray_*` functions, **you must actually consume (e.g. test/calculate, or copy) these numbers between each call**.

``` js
const gen = new RandomGenerator();

// ⚠️Warning⚠️: Consume these numbers before making another call to nextArray_*
const randomArray1 = gen.nextArray_Number();   // 1000 float Numbers in [0, 1)
console.log(randomArray1);

// the values originally in randomArray1 will be replaced now!
const randomArray2 = gen.nextArray_Number();   // 1000 floats in [0, 1)
console.log(randomArray2);

console.log(randomArray1 === randomArray2);    // true (same buffer!)
```

#### Set Output Array Size
``` js
// providing null seeds on instantiation will auto-seed the generator
const gen = new RandomGenerator(PRNGType.PCG, null, 0, 200);
const randomArray = gen.nextArray_Number();    // 200 random floats in [0, 1)

// resize output buffer reserved by WASM instance
gen.outputArraySize = 42;                      // change output array size
randomArray = gen.nextArray_Number();          // 42 random floats in [0, 1)
console.log(randomArray);

// this exceeds the set memory limits of the WASM instance
gen.outputArraySize = 5000;                    // Runtime Error ⚠️
```

The AssemblyScript configuration in `asconfig.release.json` specifies a fixed WASM memory size of 1 page. This is intentionally kept small to limit resources allocated to WASM instances -- and because output arrays larger than the default of 1000 don't increase performance any further, even when generating very large quantities of random numbers.

If for some reason you need a larger array, you can increase the configured memory size and [rebuild the library](#working-with-this-repo).

### Seeding
Seeding is optional, such that when no seeds are provided, a `RandomGenerator` will seed itself automatically (using the `seed64Array()` function internally). Using high quality seeds is important, as summarized on Vigna's Xoshiro page:
> We suggest to use [SplitMix64](https://prng.di.unimi.it/splitmix64.c) to initialize the state of our generators starting from a 64-bit seed, as [research has shown](https://dl.acm.org/citation.cfm?doid=1276927.1276928) that initialization must be performed with a generator radically different in nature from the one initialized to avoid correlation on similar seeds.

#### Manual Seeding
Manual seeding is done by providing a collection of random `BigInt` values, which will be treated as unsigned 64-bit integers and used to initialize the generator state. Each generator type requires a different number of seeds (between 1 and 8) - see [API docs](#javascript-api) for more details.
``` js
const customSeeds = [7n, 9876543210818181n];    // Xoroshiro128+ takes 2 BigInt seeds
const customSeededGen = new RandomGenerator(PRNGType.Xoroshiro128Plus, customSeeds);
```

#### Generate a Unique Seed Collection with `seed64Array()`
The `seed64Array()` function is also provided as a means of generating your own random seeds, which can then be shared between multiple generators, e.g. each running in a different thread (see the [`pmc` demo](#demos) for an example of this).

This function returns an `Array<BigInt>` containing 8 seeds generated with SplitMix64, which in turn was seeded with a combination of the current time and JavaScript's `Math.random()`. This collection of seeds is suitable to be provided as the `seeds` argument of any generator type.

Sharing seeds between generators assumes you will also provide a unique `jumpCountOrSteamIncrement` argument:
- For the PCG PRNG, this will set the internal increment value within the generator, which selects a unique random stream to be generated given a specific starting state
- For Xoshiro family PRNGs, this will advance (jump) the initial state to a unique point within the period, allowing for effectively the same behavior - choosing a random stream to be generated given a specific starting state
``` js
const sharedSeeds = seed64Array();    // Array<bigint>(8)

// 2 PCG generators, using the same seeds but choosing unique streams
const streamIncrement1 = 17n;
const pcgGen1 = new RandomGenerator(PRNGType.PCG, sharedSeeds, streamIncrement1);
const pcgNum1 = pcgGen1.nextNumber();

const streamIncrement2 = 12345678901234n;
const pcgGen2 = new RandomGenerator(PRNGType.PCG, sharedSeeds, streamIncrement2);
const pcgNum2 = pcgGen2.nextNumber();

console.log(pcgNum1 === pcgNum2);     // false

// Two Xoshiro256+ generators using the same seeds, but with unique jumpCounts
const jumpCount1 = 0;
const seededGen1 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, jumpCount1);
const num1 = seededGen1.nextNumber();

const jumpCount2 = 1;
const seededGen2 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, jumpCount2);
const num2 = seededGen2.nextNumber();

console.log(num1 === num2);           // false

// Another Xoshiro256+ generator using the same seeds, and same jumpCount as seededGen2
const jumpCount3 = 1;
const seededGen3 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, jumpCount3);
const num3 = seededGen3.nextNumber();

console.log(num2 === num3);           // true: using same seeds and jumpCount!!
```


## [JavaScript API](docs/js-api.md)
See **[JavaScript API Docs](docs/js-api.md)** to view the entire interface.

The library also contains JSDoc comments which should be visible in IDEs as you write your code.


## [AssemblyScript API](docs/as-api.md)
See **[AssemblyScript API Docs](docs/as-api.md)** to view the entire interface.

The library also contains JSDoc comments which should be visible in IDEs as you write your code.


## Compatibility
See the [WebAssembly Features Roadmap](https://webassembly.org/features/) for the latest compatibility information across various browsers and Node versions.

Note that this library makes use of the following feature extensions:
- [JS BigInt to Wasm i64 Integration](https://github.com/WebAssembly/JS-BigInt-integration) - Used to seed all PRNGs and to generate `BigInt` return types
- [Fixed-width SIMD](https://github.com/WebAssembly/simd/blob/master/proposals/simd/SIMD.md) - Any SIMD PRNG Algorithm Type uses this feature


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
