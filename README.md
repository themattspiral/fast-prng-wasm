# fast-prng-wasm

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE.md) [![npm package version](https://img.shields.io/npm/v/fast-prng-wasm.svg?style=flat&logo=npm)](https://www.npmjs.com/package/fast-prng-wasm) [![CI/CD Pipeline](https://github.com/themattspiral/fast-prng-wasm/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/themattspiral/fast-prng-wasm/actions/workflows/ci-cd.yml) [![codecov](https://codecov.io/gh/themattspiral/fast-prng-wasm/branch/main/graph/badge.svg)](https://codecov.io/gh/themattspiral/fast-prng-wasm)


High-performance, SIMD-enabled, WebAssembly pseudo random number generators (PRNGs) with a seamless TypeScript interface. Faster and better statistical quality than `Math.random()`.

**Perfect for:** Simulations, Monte Carlo methods, games, procedural generation, parallel computations

- [Quick Start](#quick-start)
- [Features](#features)
- [PRNG Algorithms](#prng-algorithms)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Examples & Demos](#examples--demos)
- [Testing & Verification](#testing--verification)
- [Performance](#performance)
- [Compatibility](#compatibility)
- [Contributing](#contributing)

## Quick Start

```bash
npm install fast-prng-wasm
```

```typescript
import { RandomGenerator } from 'fast-prng-wasm';

const gen = new RandomGenerator();  // Xoroshiro128+ SIMD is default
console.log(gen.float());           // random 53-bit float (number) in [0, 1)
console.log(gen.int53());           // random 53-bit int (number)
console.log(gen.int64());           // random 64-bit int (bigint)
```

## Features

- **🚀 High Performance** - Optimized for speed and SIMD-accelerated
- **📊 Better Statistical Quality** - Superior uniformity and randomness vs. `Math.random()`
- **⚡ Bulk Generation** - Single values or bulk array fills
- **🎯 Simple API** - Clean TypeScript interface, no memory-management required
- **🔢 Multiple Formats** - 64-bit `bigint`, 53-bit int, 32-bit int, and 53-bit float
- **🌱 Seedable** - Full control over initialization (or automatic seeding)
- **🧵 Parallel-Ready** - Unique stream selection for multi-threaded applications
- **✨ Zero Config** - Synchronous WASM loading, no `fs` or `fetch` required
- **🌐 Universal** - Works in Node.js 16.4+ and all modern browsers
- **📦 AssemblyScript Library** - Can be imported to larger WASM project builds

## PRNG Algorithms

| Algorithm | Description | Native Output | State Size | Period | SIMD |
|-----------|-------------|---------------|------------|--------|------|
| **Xoshiro256+** | Very fast, large state, very long period - best for applications needing maximum randomness guarantees | 64-bit | 256 bits | 2<sup>256</sup> | ✅ |
| **Xoroshiro128+** | *Very* fast, smaller state - excellent balance for most applications, fastest provided here | 64-bit | 128 bits | 2<sup>128</sup> | ✅ |
| **PCG (XSH RR)** | Small state, fast, possibly best randomness (read Learn More links) | 32-bit | 64 bits | 2<sup>64</sup> | ❌ |

The included algorithms were chosen for their high speed, parallelization support, and statistical quality. They pass rigorous statistical tests (BigCrush, PractRand) and provide excellent uniformity, making them suitable for Monte Carlo simulations and other applications requiring high-quality pseudo-randomness. They offer a significant improvement over `Math.random()`, which varies by JavaScript engine and may exhibit statistical flaws.

**SIMD (Single Instruction, Multiple Data)** generates 2 random numbers simultaneously, theoretically doubling throughput when using array output methods.

> **⚠️ Security Note:** These PRNGs are NOT cryptographically secure. Do not use for cryptography or security-sensitive applications, as they are not resilient against attacks that could reveal sequence history.

#### Learn More
- [PCG: A Family of Better Random Number Generators](https://www.pcg-random.org)
- [`xoshiro` / `xoroshiro` generators and the PRNG shootout](https://prng.di.unimi.it/)

## Usage Guide

### Importing

#### ES Module (bundler / modern browser / modern Node)
```typescript
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

```typescript
const gen = new RandomGenerator();      // Xoroshiro128Plus_SIMD, auto-seeded
console.log(gen.int64());               // unsigned 64-bit int (bigint)
console.log(gen.int53());               // unsigned 53-bit int (number)
console.log(gen.int32());               // unsigned 32-bit int (number)
console.log(gen.float());               // 53-bit float (number) in [0, 1)
console.log(gen.coord());               // 53-bit float (number) in (-1, 1)
console.log(gen.coordSquared());        // 53-bit float (number) in (-1, 1) squared

const pcgGen = new RandomGenerator(PRNGType.PCG);
console.log(pcgGen.int64());
// ... etc - all PRNG types expose the same JS/TS interface
```

The internal WASM binary is instantiated automatically when a `RandomGenerator` instance is created.

### Array Output (Bulk Array Fill)

The fastest way to get random numbers **in bulk** is to use the `*Array()` methods of `RandomGenerator`. Each call fills a WASM memory buffer with the next 1000 (by default) random numbers, and returns a view of the buffer as an appropriate [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray): either `BigUint64Array` for `int64Array()`, or `Float64Array` for all methods.

> **💡 SIMD Performance:** Array methods **MUST** be used to realize the additional throughput offered by SIMD-enabled PRNG algorithms. These have higher throughput because they produce 2 random numbers at the same time with WASM's 128-bit SIMD support) .

#### Bulk Fill Example
```typescript
const gen = new RandomGenerator();

// `bigint`s in BigUint64Array
const bigintArray = gen.int64Array();     // 1000 64-bit integers

// `number`s in Float64Array
let numberArray = gen.int53Array();       // 1000 53-bit integers
numberArray = gen.int32Array();           // 1000 32-bit integers
numberArray = gen.floatArray();           // 1000 floats in [0, 1)
```

#### WASM Array Memory Buffer
> **⚠️ Reused Buffer Warning:** The array returned by these methods is actually a `DataView` looking at a portion of WebAssembly memory. This memory buffer is **reused between calls** to the `*Array()` methods (to minimize WASM-JS boundary crossing time), so **you must actually consume (e.g. read/copy) the output between each call**.

```typescript
const gen = new RandomGenerator();

// ⚠️ Warning: Consume before making another call to any method that returns a Float64Array
const array1 = gen.floatArray();          // 1000 floats in [0, 1)
console.log(array1);                      // consume (extract random results)

// Values originally in array1 have been replaced! (despite different local variable)
const array2 = gen.floatArray();          // 1000 new floats in [0, 1)
console.log(array2);                      // consume again (extract more random results)

console.log(array1 === array2);           // true (same array in memory)
console.log(array1[42] === array2[42]);   // true (second call refilled the same array)
```

#### Set Array Output Size
If you don't need 1000 numbers with each method call, you can specify your preferred size for the output array via the constructor. Note that an array larger than the default of 1000 does not increase performance further in test scenarios. For a detailed explanation, see: [Understanding Performance: Why Array Methods Are Faster](examples/basic-usage#understanding-performance-why-array-methods-are-faster).

```typescript
// Set size of output buffer to 200
//  - `null` for `seeds` param will auto-seed
//  - `null` for `uniqueStreamId` param will use default stream
const gen = new RandomGenerator(PRNGType.PCG, null, null, 200);
let randomArray = gen.floatArray();       // 200 floats in [0, 1)

// To use a different size, create a new generator instance
const gen2 = new RandomGenerator(PRNGType.PCG, null, null, 42);
randomArray = gen2.floatArray();          // 42 floats in [0, 1)
```

> **⚙ Memory Constraint Note:** The `outputArraySize` parameter is **immutable after construction** due to intentional memory constraints. We use AssemblyScript's stub runtime for performance, but it employs a simple bump allocator that never frees memory. `asconfig.release.json` specifies a fixed WASM memory size of 1 page (64KB) - intentionally kept small to limit resources, but enough space for the default of 1000 numbers. This allows a maximum array size of ~3000 elements, considering that we allocate 2 types for each generator.

Arrays exceeding memory limits will fail at construction:
> ```typescript
> // exceeds the configured memory limits of WASM instances
> const gen = new RandomGenerator(PRNGType.PCG, null, null, 5000);  // Runtime Error ⚠️
> ```

### Manual Seeding
Manual seeding is optional. When no seeds are provided, a `RandomGenerator` will seed itself automatically.

Manual seeding is done by providing a collection of `bigint` values to initialize the internal generator state. Each generator type requires a different number of seeds (between 1 and 8). The required count for a specific PRNG is exposed via `RandomGenerator`'s `seedCount` property, as well as in the `SEED_COUNT` variable and `setSeed()` function signature in the [AssemblyScript API](docs/as-api.md).

```typescript
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

See the [`pmc` demo](examples/pmc) for an example that follows this approach, with each generator instance running in a different Node worker thread.

#### Generate a Seed Collection
If you don't have custom seeds already, the `seed64Array()` function is provided. It returns a `bigint[8]` containing seeds generated with SplitMix64. The initial SplitMix64 seed uses `crypto.getRandomValues()` when available (all modern browsers and Node.js 15+) for strong entropy, falling back to combining multiple entropy sources (`Date.now()`, `performance.now()`, and `Math.random()`) in older environments. This collection can be provided as the `seeds` argument for any PRNG in this package.

#### Choose a Unique Stream for Each Parallel Generator
Sharing seeds between generators assumes you will also provide a unique `uniqueStreamId` argument:
- For the PCG PRNG, this will set the internal increment value within the generator, which selects a unique random stream given a specific starting state (seed).
- For Xoshiro family PRNGs, this will advance the initial state (aka `jump()`) to a unique point within the generator period, allowing for effectively the same behavior - choosing a non-overlapping random stream given a specific starting state

In both cases, this value is simply a unique positive integer (the examples below provide this as `bigint` literals).

#### Examples

```typescript
const sharedSeeds = seed64Array();    // bigint[8]

// Two PCG generators, using the same seeds but choosing unique stream increments (5n vs 4001n)
const pcgGen1 = new RandomGenerator(PRNGType.PCG, sharedSeeds, 5n);
const pcgNum1 = pcgGen1.float();

const pcgGen2 = new RandomGenerator(PRNGType.PCG, sharedSeeds, 4001n);
const pcgNum2 = pcgGen2.float();

console.log(pcgNum1 === pcgNum2);     // false

// Two Xoshiro256+ generators using the same seeds, but with unique jump counts (1n vs 13n)
const seededGen1 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, 1n);
const num1 = seededGen1.float();

const seededGen2 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, 13n);
const num2 = seededGen2.float();

console.log(num1 === num2);           // false

// Another Xoshiro256+ generator using the same seeds, and same jump count (13n) as seededGen2.
// ⚠️ seededGen2 and seededGen3 are effectively identical and will return the same random stream.
const seededGen3 = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD, sharedSeeds, 13n);
const num3 = seededGen3.float();

console.log(num2 === num3);           // true: using same seeds and same uniqueStreamId!!
```

### Using from AssemblyScript Projects
```typescript
// import the namespace(es) you want to use
import { PCG, Xoroshiro128Plus } from 'fast-prng-wasm/assembly';

Xoroshiro128Plus.setSeeds(57n, 1000123n);             // manually seeded - seed64Array() only in JS

const rand: u64 = Xoroshiro128Plus.uint64();          // using the AS interface
const rand2: f64 = Xoroshiro128Plus.uint53AsFloat();  // return types are cast for JS runtime usage

const arr = new Uint64Array(1000);                    // create array in WASM memory
Xoroshiro128Plus.uint64Array(arr);                    // generate & fill
```

> **⚠️ Thread Safety Warning ⚠️:**
> WASM PRNG implemetations use top-level internal state and functions to
> prevent the accumulation of small overhead that comes with using classes.
> 
> While they are encapsulted within namespaces so as not to interfere with
> your own AssemblyScript project's global namespace, this also means that
> they are NOT THREAD SAFE WITHIN WASM DIRECTLY.
> 
> To acheive thread safety from the JS runtime calling your AssemvblyScript WASM
> project binary, it must be structured in such a way as to create separate WASM 
> instances from JS. This is the approach used by the included JavaScript/TypeScript wrapper API.

## API Documentation

- **[JavaScript/TypeScript API Documentation](docs/js-api.md)**
- **[AssemblyScript API Documentation](docs/as-api.md)**

## Examples & Demos

See the [`examples/` folder](examples/) for all available examples and demos.

#### [**`basic-usage` - Getting Started**](examples/basic-usage)
A simple walkthrough of core features
- Quick start for new users
- Covers all major API methods
- Basic performance comparisons and tips
- Practical examples (dice simulator, Monte Carlo basics)

#### [**`pmc` - Pi Monte Carlo**](examples/pmc)
A Monte Carlo statistical estimation of π (pi) using a large quantity of random numbers
- Node CLI app for advanced users
- Uses parallel generator instances in `worker_threads`
- Shares seeds across instances, using a unique jump count / stream increment for each

## Testing & Verification

This library employs a dual-layer testing strategy to ensure algorithm correctness and statistical quality:

**AssemblyScript Unit Tests** validate core algorithm implementations:
- **Determinism:** 10K-sample sequences match exactly with same seeds (chance coincidence effectively zero)
- **Uniqueness:** 10K consecutive values confirmed unique (collision probability ~10⁻¹²)
- **Range validation:** 10K samples verify correct boundaries (high/low bit coverage >99.99%)
- **Uniformity smoke tests:** Basic quartile distribution checks across 100K samples
- **Monte Carlo smoke tests:** π estimation within expected tolerance across 100K samples

**JavaScript Integration Tests** provide rigorous statistical validation:
- **Chi-square uniformity:** 1M samples detect deviations as small as 0.3% (>99.9% confidence)
- **Serial correlation:** 100K samples verify independence with standard error ~0.003 (>99.9% confidence)
- **Monte Carlo π estimation:** 1M samples with tolerance ±0.01 (>99.9% confidence)
- **Randomized edge case testing:** 10 iterations per test with freshly generated random seeds on each run to catch edge cases fixed seeds might miss

All algorithms are tested for uniqueness, full-range output, array method consistency, and parallel stream independence. The test suite maintains >90% code coverage across both AssemblyScript and JavaScript layers.

| Test Type | Sample Size | Statistical Power | Purpose |
|-----------|-------------|-------------------|---------|
| AS: Deterministic | 10K | N/A (deterministic) | Algorithm correctness |
| AS: Distribution | 100K | >99% confidence | Smoke testing |
| JS: Chi-square | 1M | >99.9% confidence | Uniformity validation |
| JS: Correlation | 100K | >99.9% confidence | Independence validation |
| JS: Monte Carlo | 1M | >99.9% confidence | Comprehensive validation |

## Performance

The goal is to provide random number generation in WASM that's faster and higher-quality than `Math.random()`, and faster than any equivalent JavaScript implementation of these PRNG algorithms.

Generator algorithms are implemented in [AssemblyScript](https://www.assemblyscript.org/), a variant of TypeScript that compiles to WASM.

#### Key performance advantages:
- PRNG algorithms chosen for speed
- WASM is faster than JS by design
- AssemblyScript project structure and compilation are optimized for speed
- Bulk array generation minimizes JS/WASM boundary crossing overhead
- Reusing WASM array memory avoids alloc delays and heap fragmentation
- SIMD acceleration can nearly double throughput for supported algorithms
- Monte Carlo unit square vs unit circle test included for validation

> ⚡ Additional performance stats coming soon! ⚡

#### Arrays Deep Dive

For a detailed explanation of **why array methods are 3-5× faster** than single-value methods, see **[Understanding Performance: Why Array Methods Are Faster](examples/basic-usage#understanding-performance-why-array-methods-are-faster)**

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
