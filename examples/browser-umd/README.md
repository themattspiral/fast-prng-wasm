# browser-umd - fast-prng-wasm in the Browser (UMD)

A single-page, no-bundler browser demo. It loads `fast-prng-wasm` with a plain `<script>` tag (the UMD build) and exercises the core API interactively: single values, editable seeds (type the same seeds twice to see the stream reproduce), an array-fill histogram with a sample-size control, and a Monte Carlo π scatter plot.

It also demonstrates the **environment-aware default**: the page creates its generator with `new RandomGenerator()` (no explicit type), which auto-selects the SIMD algorithm where WebAssembly SIMD is available and the non-SIMD sibling where it isn't — so the demo works on every browser, including those without SIMD. Selecting a SIMD algorithm *explicitly* from the dropdown on a non-SIMD browser shows the guard's thrown error.

## Requirements
A modern browser. See the [Compatibility](../../README.md#compatibility) section of the main README.

## Running the Demo

This demo loads the **local** UMD build at `../../dist/index.umd.js`, so build the library first from the repo root:

```sh
npm install
npm run build
```

Then, from this directory, either **open `index.html` directly** in your browser (the WASM binaries are inlined into the UMD bundle, so it works over `file://` with no server), **or** serve it over http:

```sh
npm start        # zero-dependency static server → http://localhost:8080/...
```

## Loading from a CDN

You can also load the published package from a CDN — no install or build required. The UMD bundle attaches a global named `fastPRNGWasm`:

```html
<!-- unpkg -->
<script src="https://unpkg.com/fast-prng-wasm"></script>

<!-- or jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/fast-prng-wasm"></script>

<script>
  const { RandomGenerator, PRNGType, seed64Array } = fastPRNGWasm;
  const gen = new RandomGenerator();   // auto-selects Xoroshiro128+ (SIMD when the runtime supports it)
  console.log(gen.float());
</script>
```

Pin a version for production, e.g. `https://unpkg.com/fast-prng-wasm@1.2.3`. The explicit bundle paths `https://unpkg.com/fast-prng-wasm/dist/index.umd.js` and `https://cdn.jsdelivr.net/npm/fast-prng-wasm/dist/index.umd.js` always resolve to the UMD build.

---

**Need help?** Open an issue: https://github.com/themattspiral/fast-prng-wasm/issues
