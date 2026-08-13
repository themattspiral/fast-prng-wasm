# assemblyscript-consumer - Using fast-prng-wasm from AssemblyScript

An example [AssemblyScript](https://www.assemblyscript.org/) project that imports a PRNG from `fast-prng-wasm`'s **AssemblyScript sources** and uses it directly in WASM — no JavaScript wrapper. It compiles to its own WASM binary with `asc`, then a small Node runner reads the results.

This is the path for consumers who are *already* compiling their own AssemblyScript to WASM and want high-quality random numbers inside that binary, rather than calling the library from JavaScript.

## What it computes

The example runs a **bootstrap** — a resampling method that estimates how uncertain a statistic is by re-drawing the observed data with replacement many times. It bootstraps the **Pearson correlation between LSAT score and GPA** across a classic 15-school sample (Efron & Tibshirani, *An Introduction to the Bootstrap*, 1993). The correlation's standard error has no clean closed form, which is exactly why the bootstrap is the textbook tool for it.

The same bootstrap is run with **two of the library's generators** (Xoroshiro128+ and PCG) to show the AssemblyScript namespaces coexisting and agreeing, and it reports **two 95% confidence intervals** — the simple percentile interval and the bias-corrected-and-accelerated (BCa) interval, which differ visibly for a skewed statistic like a correlation.

This is a genuine "you want a fast, high-quality generator here" workload: with only 15 data points, each resample draws 15 indices, so a million resamples is ~15 million random draws — and a biased or low-quality generator would distort the resulting interval. The resampling, the per-resample correlation, the standard error, and both intervals all run in WASM; only the final scalars cross back to JS.

## Requirements
**Node 18+** (the library's supported floor). AssemblyScript is installed as a dev dependency of this example.

## How it differs from the other examples
Unlike `basic-usage` and `pmc`, this example does **not** require you to build the `fast-prng-wasm` library first. Those examples consume the compiled JavaScript in `dist/`; this one consumes the checked-in AssemblyScript sources in the package's `assembly/` folder directly. You only need to compile **this example's** own AssemblyScript.

## Running the Example
This project uses a local dependency for `fast-prng-wasm` (`file:../..`), resolved by `npm install`. In your own project you would instead `npm install fast-prng-wasm`.

```sh
npm install     # installs assemblyscript + links fast-prng-wasm
npm run build   # compiles assembly/main.ts -> build/release.wasm
npm start       # runs index.js against the compiled WASM
```

`npm start` runs one million resamples by default. Pass a count to run more or fewer, e.g. `node index.js 5000000`.

## Output
The runner prints the observed correlation (≈ 0.776, a fixed property of the data) and, per generator, the bootstrap standard error (≈ 0.13), a 95% percentile interval (≈ [0.46, 0.96]), a 95% BCa interval (≈ [0.33, 0.94]), and the elapsed resampling time. Both generators land on the same answer. The intervals are wide but well clear of zero — with only 15 schools the correlation is clearly positive, but its exact magnitude stays uncertain.

The BCa interval's lower bound sits noticeably below the percentile one: a correlation is skewed and bounded at ±1, so the plain percentiles are slightly off and BCa corrects for that (which is why Efron recommends it for a statistic like this). The generators are seeded from the host's cryptographic randomness on each run, so the exact standard-error and interval digits vary slightly run to run; the observed correlation does not. The time column is a rough, this-machine cost — not a benchmark.

## Verifying the results
BCa is non-trivial (a normal CDF and inverse plus a jackknife, all implemented in `main.ts`), so [`verify/`](verify/) cross-checks the demo's output against an **independent** Python-stdlib implementation — a different language, a different normal CDF/inverse, and a different RNG. Run it by hand with `node verify/verify.mjs` after `npm run build` (needs `python3`; not part of CI). See [`verify/README.md`](verify/README.md) for details.

## Import patterns

**Whole package (all generators):**
```typescript
import { PCG, Xoroshiro128Plus } from 'fast-prng-wasm/assembly';
```
Each generator is a namespace — they share function names, so the namespaces keep them from colliding. This pulls in the SIMD generators, so compiling requires `--enable simd` (see `asconfig.json`), even if you only use a non-SIMD algorithm.

**One generator directly:**
```typescript
import * as Xoroshiro128Plus from 'fast-prng-wasm/assembly/prng/xoroshiro128plus';
```
Compiles only the algorithm you import, and needs no SIMD flag for the non-SIMD generators — the leaner choice when you want just one.

## Notes for AssemblyScript consumers
- **Seeding needs a host randomness source.** WASM has no ambient randomness, so the raw entropy has to come from the host. This example imports one high-quality 64-bit value per call as `nextSeed` (bound to `env` with `@external("env", "nextSeed")`) and seeds each generator inside AssemblyScript at load — top-level `setSeeds(...)` calls run in the module's start function during `WebAssembly.instantiate`, when the import is already available. The JS runner supplies `nextSeed` (see its `seed64()`); the library's own `seed64Array()` is JavaScript-only.
- **Manual seeding still works.** Pass explicit `u64` values to `setSeeds(...)` for a fixed, reproducible stream — use the `u64(...)` form, as AssemblyScript has no BigInt `123n` literal syntax.
- **Each generator needs a specific number of seeds** (`SEED_COUNT`): PCG 1, Xoroshiro128+ 2, Xoshiro256+ 4, Xoroshiro128+ SIMD 4, Xoshiro256+ SIMD 8. Passing the wrong count is a compile error.
- **Bounded integers**: the AS API has no integer-range method, so draw a uniform index in `[0, n)` as `<i32>(float53() * <f64>n)` — as `main.ts` does when resampling. `float53()` is in `[0, 1)`, so the bias is bounded by ~`n / 2^53` (negligible for any real `n`).
- **Pass typed arrays directly** to the array-fill methods (e.g. `float53Array(arr)`).

---

**Need help?** Open an issue: https://github.com/themattspiral/fast-prng-wasm/issues
