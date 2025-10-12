# pmc - Pi Monte Carlo Estimation
A [Monte Carlo estimation of pi (π)](https://www.geeksforgeeks.org/estimating-value-pi-using-monte-carlo/) using a large quantity of random numbers, demoing the **`fast-prng-wasm`** library.

- Node CLI app
- Parallel point generation using node [`worker_threads`](https://nodejs.org/api/worker_threads.html)
- Configurable
- This project is a good example of using a single set of shared seeds across multiple generators, combined with providing `uniqueStreamId` values (via a parameter on generator creation) to select a unique random stream for each generator.

## Requirements
See the [Compatability]() section of `fast-prng-wasm`'s README, but generally **Node 16.4+** for full support (SIMD + bigint).

## Running the Example
This project uses a local dependency for `fast-prng-wasm`, so you must build the local library project first, or install a published version.

#### Library Build
From the `fast-prng-wasm` project root:
``` sh
npm i
npm run build
```

As an alternative, you can install the latest published version. From this example directory:
```sh
npm i fast-prng-wasm@latest
```

#### Run the Demo
From this directory:
``` sh
npm i
node start
```

## Output
This example will estimate the value of π by generating 1 billion (x,y) coordinate pairs (2 billion random numbers) using all availavle CPU cores and the default (and fastest) PRNG that `fast-prng-wasm` provides, `Xoroshiro128Plus_SIMD`.

## Runtime Parameters
Modify parameters within `pmc.js` to alter characteristics of the PRNGs used:

**`TOTAL_POINT_COUNT`**: Number of random coordinate pairs between -1 and 1 to generate (across all worker threads) for this run. Defaults to 1,000,000,000 (1B) random coordinate pairs (2B random numbers) 

**`PRNG`**: The PRNG algorithm being used

**`WORKER_BATCH_MODE`**: Approach to transferring generated random numbers from WASM to the JS runtime, which has a notable impact on performance with large batches of numbers
  - `WorkerBatchModeType.Single`: Makes one function call per random number (2 calls per point) to `fast-prng-wasm`
  - `WorkerBatchModeType.ArrayFill`: Uses `fast-prng-wasm`'s array fill functions to retreive batches of random numbers from the generator. Computation in JS checks if each point falls within the unit circle.
  - `WorkerBatchModeType.GeneratorBatch`: The fastest option, using Monte Carlo unit circle estimation embedded in the PRNG. In this case, random numbers transferred back into the JS runtime - only the result (number of tested points that fell within the unit circle) is returned with each call.

**`WORKER_COUNT`**: Number of workers to simultaneously generate random points. Defaults to your OS's [available parallelism](https://nodejs.org/api/os.html#osavailableparallelism)

**`WORKER_SEED_MODE`**: How the PRNG in each worker thread should be seeded:
  - `WorkerSeedModeType.ParentSeeded`: Generate one set of seeds in main thread and use it to seed each PRNG instance in worker threads, additionally providing a `uniqueStreamId` value for each.
  - `WorkerSeedModeType.WorkerSeeded`: Each generator instance seeds itself uniquely

**`GENERATOR_ARRAY_OUTPUT_SIZE`**: The size of the output array used when calling `*Array()` methods. This was configured mainly for testing how different array sizes impact performance.
  - The sweet spot seems to be 100 - 1000, so pmc leaves this the same as `fast-prng-wasm`'s default, 1000. YMMV.
  - Only applicable when `WORKER_BATCH_MODE` is set to `WorkerBatchModeType.ArrayFill`

---

**Need help?** Open an issue: https://github.com/themattspiral/fast-prng-wasm/issues
