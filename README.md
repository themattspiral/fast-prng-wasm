# fast-prng-wasm
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md) [![npm package version](https://img.shields.io/npm/v/fast-prng-wasm.svg?style=flat)](https://www.npmjs.com/package/fast-prng-wasm) [![CI/CD Pipeline](https://github.com/themattspiral/fast-prng-wasm/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/themattspiral/fast-prng-wasm/actions/workflows/ci-cd.yml)

High-performance, SIMD-enabled, WebAssembly pseudo random number generators (PRNGs) with a seamless JavaScript interface. Faster and better statistical quality than `Math.random()`.

**Perfect for:** Simulations, Monte Carlo methods, games, procedural generation, and parallel computations.

- [Quick Start](#quick-start)
- [Features](#features)
- [PRNG Algorithms](#prng-algorithms)
- [Usage Guide](#usage-guide)
- [Performance](#performance)
- [Demos](#demos)
- [API Documentation](#api-documentation)
- [Compatibility](#compatibility)
- [Contributing](#contributing)

## Quick Start

```bash
npm install fast-prng-wasm
```

```javascript
import { RandomGenerator } from 'fast-prng-wasm';

const gen = new RandomGenerator();
console.log(gen.nextNumber());      // random 53-bit float (number) in [0, 1)
console.log(gen.nextInteger());     // random 53-bit int (number)
console.log(gen.nextBigInt());      // random 64-bit int (bigint)
```

## Features

- **🚀 High Performance** - Optimized for speed and SIMD-accelerated
- **🎯 Simple API** - Clean JavaScript/TypeScript interface
- **🌐 Universal** - Works in Node.js 16.4+ and all modern browsers
- **✨ Zero Config** - Synchronous WASM loading, no `fs` or `fetch` required
- **⚡ Bulk Generation** - Single values or bulk array fills (up to 1000 at once)
- **🔢 Multiple Formats** - 64-bit `bigint`, 53-bit int, 32-bit int, or float (0 to 1)
- **🌱 Seedable** - Full control over initialization (or automatic seeding)
- **🧵 Parallel-Ready** - Unique stream selection for multi-threaded applications
- **📦 AssemblyScript Compatible** - Use within larger WASM project builds

## PRNG Algorithms

These algorithms are optimized for high speed, excellent statistical randomness, and parallelization support.

| Algorithm | Native Output Size | State Size | Period | SIMD Support |
|-----------|-------------|------------|--------|--------------|
| **Xoshiro256+** | 64-bit | 256 bits | 2<sup>256</sup> | ✅ |
| **Xoroshiro128+** | 64-bit | 128 bits | 2<sup>128</sup> | ✅ |
| **PCG (XSH RR)** | 32-bit | 64 bits | 2<sup>64</sup> | ❌ |

**SIMD (Single Instruction, Multiple Data)** generates 2 random numbers simultaneously, theoretically doubling throughput when using array output methods.

> **⚠️ Security Note:** These PRNGs are NOT cryptographically secure. Do not use for cryptography or security-sensitive applications, as they are not resilient against attacks that could reveal sequence history.

### Learn More
- [PCG: A Family of Better Random Number Generators](https://www.pcg-random.org)
- [`xoshiro` / `xoroshiro` generators and the PRNG shootout](https://prng.di.unimi.it/)

## Usage Guide

### Importing

#### ES Module (bundler / modern browser / modern Node)
```javascript
import { RandomGenerator, PRNGType, seed64Array } from 'fast-prng-wasm';
```

#### CommonJS (legacy Node)
```javascript
const { RandomGenerator, PRNGType, seed64Array } = require('fast-prng-wasm');
```

#### UMD (browser script tag)
```html
<script src="https://unpkg.com/fast-prng-wasm"></script>
<script>
  const { RandomGenerator, PRNGType, seed64Array } = fastPRNGWasm;
</script>
```

### The Basics

```javascript
// Default PRNG type is Xoroshiro128Plus_SIMD with auto-seeding
const gen = new RandomGenerator();
console.log(gen.nextBigInt());          // unsigned 64-bit int (bigint)
console.log(gen.nextInteger());         // unsigned 53-bit int (number)
console.log(gen.nextInteger32());       // unsigned 32-bit int (number)
console.log(gen.nextNumber());          // 53-bit float (number) in [0, 1)

// All PRNG types expose the same interface
const pcgGen = new RandomGenerator(PRNGType.PCG);
console.log(pcgGen.nextBigInt());
console.log(pcgGen.nextInteger());
console.log(pcgGen.nextInteger32());
console.log(pcgGen.nextNumber());
```

The internal WASM binary is instantiated automatically when a `RandomGenerator` instance is created.

### Array Output (Bulk Array Fill)

The fastest way to get random numbers **in bulk** is to use the `nextArray_*` methods of `RandomGenerator`. Each call fills a WASM shared memory buffer with the next 1000 (by default) random numbers, and returns a view of the buffer as an appropriate [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray): either `BigUint64Array` or `Float64Array`.

> **💡 SIMD Performance:** Array methods **MUST** be used to realize the additional throughput offered by SIMD-enabled PRNG algorithms (these have higher throughput because they produce multiple random numbers at the same time).

#### Bulk Fill Example
```javascript
const gen = new RandomGenerator();

// `bigint`s in BigUint64Array
const bigintArray = gen.nextArray_BigInt();   // 1000 64-bit integers

// `number`s in Float64Array
let floatArray = gen.nextArray_Number();      // 1000 floats in [0, 1)
floatArray = gen.nextArray_Integer();         // 1000 53-bit integers
floatArray = gen.nextArray_Integer32();       // 1000 32-bit integers
```

#### Shared Array Memory Buffer
> **⚠️ Shared Buffer Warning:** The array returned by these methods is actually a `DataView` looking at a portion of shared WebAssembly memory. This shared memory buffer is **reused between calls** to the `nextArray_*` methods, so **you must actually consume (e.g. read/copy) the output between each call**.

```javascript
const gen = new RandomGenerator();

// ⚠️ Warning: Consume this output before making another call to nextArray_*
const randomArray1 = gen.nextArray_Number();   // 1000 floats in [0, 1)
console.log(randomArray1);                     // consume (extract random results)

// Values originally in randomArray1 have been replaced! (despite different local variable)
const randomArray2 = gen.nextArray_Number();   // 1000 new floats in [0, 1)
console.log(randomArray2);                     // consume again (extract more random results)

console.log(randomArray1 === randomArray2);           // true (same shared memory array)
console.log(randomArray1[42] === randomArray2[42]);   // true (second call to nextArray_Number() refilled the same array memory)
```

#### Set Array Output Size
If you don't need 1000 numbers with each method call, you can specify your preferred size for the output array instead. Note that an array larger than the default of 1000 does not increase performance further in test scenarios.

```javascript
// Set size of output buffer to 200
//  - `null` for `seeds` param will auto-seed
//  - `null` for `jumpCountOrStreamIncrement` param will use default stream
const gen = new RandomGenerator(PRNGType.PCG, null, null, 200);
const randomArray = gen.nextArray_Number();    // 200 random floats in [0, 1)

// Resize output buffer to 42
gen.outputArraySize = 42;                      // change output array size
const randomArray2 = gen.nextArray_Number();   // 42 random floats in [0, 1)
console.log(randomArray2);

// This exceeds the set memory limits of the WASM instance
gen.outputArraySize = 5000;                    // Runtime Error ⚠️
```

> **⚙ Configuration Note:** The AssemblyScript compiler configuration in `asconfig.release.json` specifies a fixed WASM memory size of 1 page. This is intentionally kept small to limit resources allocated to WASM instances, but is still enough space for the default of 1000 numbers.

### Manual Seeding
Manual seeding is optional. When no seeds are provided, a `RandomGenerator` will seed itself automatically.

Manual seeding is done by providing a collection of `bigint` values to initialize the internal generator state. Each generator type requires a different number of seeds (between 1 and 8). The required count for a specific PRNG is exposed via `RandomGenerator`'s `seedCount` property, as well as in the `SEED_COUNT` variable and `setSeed()` function signature in the [AssemblyScript API](docs/as-api.md).

```javascript
const customSeeds = [7n, 9876543210818181n];    // Xoroshiro128+ takes 2 bigint seeds
const customSeededGen = new RandomGenerator(PRNGType.Xoroshiro128Plus, customSeeds);

const anotherGen = new RandomGenerator(PRNGType.Xoshiro256Plus);
console.log(anotherGen.seedCount);              // 4
```

Using high quality seeds is important, as summarized on Vigna's [Xoshiro page](https://prng.di.unimi.it/):
> We suggest to use [SplitMix64](https://prng.di.unimi.it/splitmix64.c) to initialize the state of our generators starting from a 64-bit seed, as [research has shown](https://dl.acm.org/citation.cfm?doid=1276927.1276928) that initialization must be performed with a generator radically different in nature from the one initialized to avoid correlation on similar seeds.

Per this guidance, automatic seeding using `seed64Array()` internally is done with SplitMix64.

### Parallel Generators & Sharing Seeds

Some PRNG applications may require several (or very many) instances of a PRNG running in parallel - for example, multithreaded or distributed computing processes. In this case it is recommended to use the same set of seeds across all parallel generator instances **in combination with** a unique jump count or stream increment. This approach essentially ensures that randomness quality is maximized across all parallel instances.

See the [`pmc` demo](demo/pmc) for an example that follows this approach, with each generator instance running in a different Node worker thread.

#### Generate a Seed Collection
If you don't have custom seeds already, the `seed64Array()` function is provided. It returns a `bigint[8]` containing seeds generated with SplitMix64 (which in turn was seeded with a combination of the current time and JavaScript's `Math.random()`). This collection can be provided as the `seeds` argument for any PRNG in this package.

#### Choose a Unique Stream for Each Parallel Generator
Sharing seeds between generators assumes you will also provide a unique `jumpCountOrStreamIncrement` argument:
- For the PCG PRNG, this will set the internal increment value within the generator, which selects a unique random stream given a specific starting state (seed).
- For Xoshiro family PRNGs, this will advance the initial state (aka `jump()`) to a unique point within the generator period, allowing for effectively the same behavior - choosing a non-overlapping random stream given a specific starting state

In both cases, this value is simply a unique positive integer.

#### Examples

```javascript
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
// ⚠️ seededGen2 and seededGen3 are effectively identical and will return the same random stream.
const seededGen3 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, 2);
const num3 = seededGen3.nextNumber();

console.log(num2 === num3);           // true: using same seeds and same jumpCount!!
```

## Performance

The goal is to provide random number generation in WASM that's faster and higher-quality than `Math.random`, and faster than any equivalent JavaScript implementation of these PRNG algorithms. 

Generator algorithms are implemented in [AssemblyScript](https://www.assemblyscript.org/), a variant of TypeScript that compiles to WASM.

**Key performance advantages:**
- PRNG algorithms chosen for speed
- WASM is faster than JS by design
- AssemblyScript project structure and compilation are optimized for speed
- Bulk array generation minimizes JS/WASM boundary crossing overhead
- Reusing shared array memory avoids alloc delays and heap fragmentation
- SIMD acceleration can nearly double throughput for supported algorithms
- Monte Carlo unit square vs unit circle test included for validation

> ⚡⚡ Performance stats and demos showing optimizations, tradeoffs, and comparisons are coming soon! ⚡⚡

## Demos

See the [`demo/` folder](demo/) for all available demos. Each one is treated as a separate project.

[**`pmc` - Pi Monte Carlo:**](demo/pmc) A Monte Carlo statistical estimation of π (pi) using a large quantity of random numbers
- Node CLI demo app
- Uses parallel generator instances in worker threads
- Shares seeds across instances with unique jump count for each

## API Documentation

- **[JavaScript API Documentation](docs/js-api.md)**
- **[AssemblyScript API Documentation](docs/as-api.md)**

## Compatibility

### Node
| Version | Notes |
|---------|-------|
| 16.4+ | Full support |
| 15.0 | All features except SIMD |
| 8.5.7 - 15 | No SIMD, No `bigint` |

> Node versions older than 15 are not recommended, as they lack support for `i64` to `bigint` conversion. Versions going back to 8.5.7 (first WASM support in Node) should otherwise still work correctly for 53-bit integer and float `number` values, though they haven't been fully tested.

### Browsers
All modern browsers are fully supported. 

| Browser | Full Support | Partial (No SIMD) | Degraded (No `bigint`) |
|---------|--------------|-------------------|------------------------|
| Chrome  | 91+ | 85 | 57 |
| Edge    | 91+ | 85 | 16 |
| Safari  | 16.4+ | 14.1 | 11 |
| Firefox | 89+ | 78 | 52 |
| Opera   | 77+ | 71 | 44 |

Check caniuse.com for other browser support:
 - [WASM SIMD](https://caniuse.com/wasm-simd) - Indicates Full Support
 - [WASM bigint](https://caniuse.com/wasm-bigint) - Support for everything except SIMD
 - [WASM](https://caniuse.com/wasm) - Basic support (53-bit int and float `number` but no 64-bit `bigint`)

## Contributing

This is an open source project, and contributions are welcome!
  - **Bugs:** Open an Issue to report a bug or request a feature
  - **Features:** For now, please first open an Issue to discuss any desired / planned contributions
  - Full contribution guidelines coming soon
  - See scripts in `package.json` for available build commands
  
---

## License

[MIT License](LICENSE.md)
