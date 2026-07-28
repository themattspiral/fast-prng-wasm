# assemblyscript-consumer - Using fast-prng-wasm from AssemblyScript

An example [AssemblyScript](https://www.assemblyscript.org/) project that imports a PRNG from `fast-prng-wasm`'s **AssemblyScript sources** and uses it directly in WASM — no JavaScript wrapper. It compiles to its own WASM binary with `asc`, then a small Node runner calls the exported functions.

This is the path for consumers who are *already* compiling their own AssemblyScript to WASM and want high-quality random numbers inside that binary, rather than calling the library from JavaScript.

## Requirements
**Node 18+** (for WASM `bigint` return values). AssemblyScript is installed as a dev dependency of this example.

## How it differs from the other examples
Unlike `basic-usage` and `pmc`, this example does **not** require you to build the `fast-prng-wasm` library first. Those examples consume the compiled JavaScript in `dist/`; this one consumes the checked-in AssemblyScript sources in the package's `assembly/` folder directly. You only need to compile **this example's** own AssemblyScript.

## Running the Example
This project uses a local dependency for `fast-prng-wasm` (`file:../..`), resolved by `npm install`. In your own project you would instead `npm install fast-prng-wasm`.

```sh
npm install       # installs assemblyscript + links fast-prng-wasm
npm run asbuild   # compiles assembly/main.ts -> build/release.wasm
npm start         # runs index.js against the compiled WASM
```

## Output
The runner prints a few single values, the mean of a bulk-filled array (≈ 0.5 for uniform floats), and a Monte Carlo π estimate over 1,000,000 samples (entirely in WASM).

## Import patterns
Both of these are verified working; pick based on whether you want the SIMD generators:

**Barrel (matches the main README):**
```typescript
import { PCG, Xoroshiro128Plus } from 'fast-prng-wasm/assembly';
```
Each generator is a namespace, kept out of your global namespace. The barrel pulls in the SIMD generators, so compiling it requires `--enable simd` (see `asconfig.json`), even if you only use a non-SIMD algorithm.

**Direct (one algorithm, no SIMD flag needed):**
```typescript
import * as Xoroshiro128Plus from 'fast-prng-wasm/assembly/prng/xoroshiro128plus';
```
Compiles only the algorithm you import, and needs no SIMD flag for the non-SIMD generators — the leaner choice when you want a single algorithm.

## Notes for AssemblyScript consumers
- **Seeding is manual.** `seed64Array()` is JavaScript-only. Seed with `setSeeds(...)`, using the explicit `u64(...)` form — AssemblyScript has no BigInt `123n` literal syntax.
- **Each generator needs a specific number of seeds** (`SEED_COUNT`): PCG 1, Xoroshiro128+ 2, Xoshiro256+ 4, Xoroshiro128+ SIMD 4, Xoshiro256+ SIMD 8. Passing the wrong count is a compile error.
- **Pass typed arrays directly** to the array-fill methods (e.g. `float53Array(arr)`). The `alloc*` memory helpers exist only to bridge the JS/WASM boundary in the JavaScript wrapper and are not needed here.

---

**Need help?** Open an issue: https://github.com/themattspiral/fast-prng-wasm/issues
