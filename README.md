# fast-prng-wasm
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/themattspiral/fast-prng-wasm/blob/main/LICENSE.md) [![npm version](https://img.shields.io/npm/v/fast-prng-wasm.svg?style=flat)](https://www.npmjs.com/package/fast-prng-wasm)

A collection of fast pseudo random number generators that run in WebAssembly.

### Features:
- Simple usage from JavaScript
- Supports both Node and browsers
- Transparent, synchronous WASM loading (embedded binaries - no `fs` or `fetch`)
- Seedable (or auto-seeded)
- Jumpable (for shared-seed/unique-stream parallelization)
- Single value and array outputs
- Designed for speed - SIMD versions allow higher throughput
- Can be imported to other AssemblyScript projects

### PRNG Algorithms:
- PCG (XSH RR)
  - [PCG: A Family of Better Random Number Generators](https://www.pcg-random.org)
- Xoroshiro128+
- Xoroshiro128+ (SIMD)
- Xoshiro256+
- Xoshiro256+ (SIMD)
  - [`xoshiro` / `xoroshiro` generators and the PRNG shootout](https://prng.di.unimi.it/)


## Usage

### ES Module `import` (bundler / modern browser / modern node)
`import { RandomGenerator } from 'fast-prng-wasm';`

### Node `require` (legacy node)
`const { RandomGenerator } = require('fast-prng-wasm');`

### UMD (browser)
`<script src="https://unpkg.com/fast-prng-wasm"></script>`

💡 UMD exposes the same generator interface on `global.fastPRNGWasm`

### Defaults & Basics
``` js
const gen = new RandomGenerator();
console.log(gen.prngType);          // "Xoroshiro128Plus_SIMD"
console.log(gen.outputArraySize);   // 1000
console.log(gen.nextBigInt());      // random 64-bit BigInt value
console.log(gen.nextNumber());      // random float Number in [0, 1)

// a PCG generator
const pcgGen = new RandomGenerator(PRNGType.PCG);
console.log(pcgGen.nextNumber());   // random float Number in [0, 1)
```

### Array Output

The fastest way to get random numbers in bulk is to use the `nextArray_*` methods of `RandomGenerator`.

💡 Array methods must be used to gain the benefit of the additional throughput offered by SIMD algorithm types (these have higher throughput because they produce multiple numbers at the same time).

``` js
const gen = new RandomGenerator();
let randomArray = gen.nextArray_Numbers();    // 1000 random floats in [0, 1)

// ⚠️ Warning: Consume these numbers before making another call to nextArray_*
console.log(randomArray);

randomArray = gen.nextArray_Numbers();        // 1000 more floats in [0, 1)
console.log(randomArray);

// re-allocate output buffer reserved by WASM instance
gen.outputArraySize = 42;                     // change output array size
randomArray = gen.nextArray_Numbers();        // 42 random floats in [0, 1)
console.log(randomArray);

// This will exceed the set memory limits of the WASM instance
gen.outputArraySize = 5000;                   // Runtime Error ⚠️
```

The AssemblyScript configuration in `asconfig.release.json` specifies a fixed WASM memory size of 1 page. This is intentionally kept small to limit resources allocated to WASM instances -- and because output arrays larger than the default of 1000 don't increase performance any further, even when generating very large quantities of random numbers.

If for some reason you need a larger array, you can increase the configured memory size and [rebuild the library](#working-with-this-repo).


## JavaScript API
Docs coming soon.

Code contains JSDoc comments which should be visible in IDEs.


## AssemblyScript API
Docs coming soon.

See `RandomGenerator` source and/or individual generator type AssemblyScript source to see the interface for now.


## Compatibility
Coming soon.


## Demos
Coming soon.


## Working With This Repo
Coming soon.

For now, see scripts in `package.json`.
