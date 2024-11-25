# fast-prng-wasm
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/themattspiral/fast-prng-wasm/blob/main/LICENSE.md) [![npm version](https://img.shields.io/npm/v/fast-prng-wasm.svg?style=flat)](https://www.npmjs.com/package/fast-prng-wasm)

A collection of fast, SIMD-enabled pseudo random number generators that run in WebAssembly.

### Features:
- Simple usage from JavaScript
- Supports both Node and browsers
- Transparent, synchronous WASM loading (embedded binaries - no `fs` or `fetch`)
- Seedable (or auto-seeded)
- Jumpable (for shared-seed/unique-stream parallelization)
- Single value and bulk array outputs
- Designed for speed - SIMD versions allow higher throughput
- Can be imported to other [AssemblyScript](https://www.assemblyscript.org/) projects as part of a larger WASM compilation

### PRNG Algorithms:
- `PRNG.PCG` (PCG XSH RR): 32-bit generator with 64 bits of state
- `PRNG.Xoroshiro128Plus` (Xoroshiro128+): 32-bit generator with 128 bits of state, and period of 2<sup>128</sup>
- `PRNG.Xoroshiro128Plus_SIMD` (Xoroshiro128+): 32-bit generator with 128 bits of state, and period of 2<sup>128</sup>
  - This version is SIMD-enabled, and so provides 2 random outputs for the price of 1
- `PRNG.Xoshiro256Plus` (Xoshiro256+): 64-bit generator with 256 bits of state, and period of 2<sup>256</sup>
- `PRNG.Xoshiro256Plus_SIMD` (Xoshiro256+): 64-bit generator with 256 bits of state, and period of 2<sup>256</sup>
  - This version is SIMD-enabled, and so provides 2 random outputs for the price of 1

#### Further Reading:
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
const gen = new RandomGenerator();    // default is Xoroshiro128Plus_SIMD
console.log(gen.nextBigInt());        // random 64-bit BigInt value
console.log(gen.nextNumber());        // random float Number in [0, 1)

const pcgGen = new RandomGenerator(PRNGType.PCG);   // a PCG generator
console.log(pcgGen.nextNumber());     // random float Number in [0, 1)
```

### Seeding
``` js
// 1) manually-defined custom seeds
// note: different PRNG types are seeded with different numbers of parameters
const customSeeds = [7n, 9876543210818181n];
const customSeededGen = new RandomGenerator(PRNGType.Xoroshiro128Plus, customSeeds);

// 2) auto-generated seed set, shared between multiple generators
const sharedSeeds = seed64Array();    // Array<bigint> (8)

const seededGen1 = new RandomGenerator(PRNGType.Xoshiro256Plus, sharedSeeds);
const num1 = seededGen1.nextNumber();

const seededGen2 = new RandomGenerator(PRNGType.Xoshiro256Plus, sharedSeeds);
const num2 = seededGen2.nextNumber();

console.log(num1 === num2);           // true

// 3) uses the same shared seed set, but also *jumps* to a different unique stream
const jumpCount = 1;
const seededGen3 = new RandomGenerator(PRNGType.Xoshiro256Plus, sharedSeeds, jumpCount);
const num3 = seededGen3.nextNumber();

console.log(num1 === num3);           // false
```

### Array Output

The fastest way to get random numbers in bulk is to use the `nextArray_*` methods of `RandomGenerator`.

💡 Array functions must be used instead of single-value functions to get the additional throughput offered by SIMD algorithm types (these have higher throughput because they produce multiple numbers at the same time).

``` js
const gen = new RandomGenerator();
let randomArray = gen.nextArray_Numbers();    // 1000 random floats in [0, 1)

// ⚠️ Warning: Consume these numbers before making another call to nextArray_*
console.log(randomArray);

randomArray = gen.nextArray_Numbers();        // 1000 more floats in [0, 1)
console.log(randomArray);

// resize output buffer reserved by WASM instance
gen.outputArraySize = 42;                     // change output array size
randomArray = gen.nextArray_Numbers();        // 42 random floats in [0, 1)
console.log(randomArray);

// this exceeds the set memory limits of the WASM instance
gen.outputArraySize = 5000;                   // Runtime Error ⚠️
```

The AssemblyScript configuration in `asconfig.release.json` specifies a fixed WASM memory size of 1 page. This is intentionally kept small to limit resources allocated to WASM instances -- and because output arrays larger than the default of 1000 don't increase performance any further, even when generating very large quantities of random numbers.

If for some reason you need a larger array, you can increase the configured memory size and [rebuild the library](#working-with-this-repo).


## JavaScript API
Docs coming soon.

Code contains JSDoc comments which should be visible in IDEs.


## AssemblyScript API
Docs coming soon.

For now, see `RandomGenerator` source, and/or individual generator AssemblyScript source to see the interface.


## Compatibility
Coming soon.


## Demos
See the `demo/` folder for all available demos. Each one is treated as a separate project:
- **`pmc`**: Pi Monte Carlo - A [Monte Carlo estimation of pi (π)](https://www.geeksforgeeks.org/estimating-value-pi-using-monte-carlo/) using a large quantity of random numbers


## Working With This Repo
Coming soon.

For now, see scripts in `package.json`.
