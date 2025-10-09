# fast-prng-wasm/demo/pmc - Pi Monte Carlo
A [Monte Carlo estimation of pi (π)](https://www.geeksforgeeks.org/estimating-value-pi-using-monte-carlo/) using a large quantity of random numbers, demoing the `fast-prng-wasm` library.

- Node CLI demo app
- Parallel point generation using node [`worker_threads`](https://nodejs.org/api/worker_threads.html)
- This project is a good example of using a single set of shared seeds across multiple generators, combined with using unique `jumpCount` values (on generator creation) to select a unique random stream for each generator.

## Install Demo Deps & Run
This demo uses a local dependency for `fast-prng-wasm`, so you must build it first (or modify the `package.json` in this directory to install a published version instead). 

From the `fast-prng-wasm` project root, install dependencies and build the library:
``` sh
npm i
npm run build
```
 
Change directory to `demo/pmc`, install demo dependencies, and then run the demo:
``` sh
cd demo/pmc
npm i
node pmc.js
```

This will estimate the value of π by generating 1 billion (x,y) points (2 billion random numbers) using all availavle CPU cores and the default PRNG that `fast-prng-wasm` provides, `Xoroshiro128Plus_SIMD`.

## Runtime Parameters
Modify parameters within `pmc.js` to alter characteristics of the PRNGs used:

**`WORKER_COUNT`**: Number of workers to simultaneously generate random points.
  - pmc defaults to your OS's [available parallelism](https://nodejs.org/api/os.html#osavailableparallelism).

**`WORKER_BATCH_MODE`**: Approach to transferring random numbers between WASM and JS runtimes, which has a notable impact on performance with large batches of numbers:
  - `WorkerBatchModeType.Single`: Makes one call per random number (2 calls per point) to `fast-prng-wasm`
  - `WorkerBatchModeType.ArrayFill`: Uses `fast-prng-wasm`'s [Array Fill functions]() (specifically `coordSquaredArray()`) to retreive batches of random numbers, and then in JS checks if each point falls within the unit circle.
  - `WorkerBatchModeType.GeneratorBatch` *(pmc default)*: The fastest option. Uses Monte Carlo estimation embedded in PRNG, so that random numbers aren't actually transferred back into the JS runtime - only the results (i.e. number of points within the unit circle) are returned, which makes this very speedy.

**`GENERATOR_ARRAY_OUTPUT_SIZE`**: The size of the output array in which each batch of numbers is placed when calling `*Array()` methods. This was configured mainly for testing how different array sizes impact performance.
  - The sweet spot seems to be 100 - 1000, so pmc leaves this the same as `fast-prng-wasm`'s default, 1000. YMMV.
  - Only applicable when `WORKER_BATCH_MODE` is set to `WorkerBatchModeType.ArrayFill`

**`WORKER_SEED_MODE`**: How the PRNG in each worker thread should be seeded:
  - `WorkerSeedModeType.WorkerSeeded`: Each PRNG across different worker threads seeds itself with a unique set of random seeds.
  - `WorkerSeedModeType.ParentSeeded` *(pmc default)*: Generate one set of seeds (in parent thread) and use it to seed each PRNG across different worker threads. Relies on PRNG algorthm's `jump` functions to select a unique random stream for each worker.
    - ⚠️ As of `fast-prng-wasm` v0.3.1, `PRNG.PCG` does not provide `jump` capability yet, and therefore should only be used in `WorkerSeeded` mode. Otherwise, each parallel generator will produce the exact same sequence (which makes for a worse estimate)

**`PRNG`**: The PRNG algorithm being used:
  - Defaults to `PRNG.Xoroshiro128Plus_SIMD`
  - See (`fast-prng-wasm`) home for all available generator types

**`TOTAL_POINT_COUNT`**: Number of random points to generate (total across all worker threads) for this estimation run.
  - Defaults to 1,000,000,000 (1 Billion) random points
