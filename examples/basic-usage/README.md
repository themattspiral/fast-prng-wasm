# basic-usage - Getting Started with fast-prng-wasm

A simple example demonstrating the core features of `fast-prng-wasm`.

## Requirements
See the [Compatability]() section of `fast-prng-wasm`'s README, but generally **Node 18+** for full support (SIMD + bigint).

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
```bash
npm i
npm start
```

## Output
This example walks through 5 concepts:

1. **Basic Generation** - Generating random values in different formats
2. **Array Generation** - Bulk array operations and performance comparison with loop-based generation
3. **Seeding for Reproducibility** - Creating deterministic random sequences (e.g. for testing)
4. **Coordinate Generation** - Monte Carlo basics with a simple π estimation
5. **Practical Example** - Dice simulator showing how to map random values to integer ranges

## Key Takeaways

### Array Methods Are Faster
```javascript
// ❌ Slow: Calling float() in a loop
for (let i = 0; i < 100000; i++) {
    numbers.push(gen.float());
}

// ✅ Fast: Using array methods
const numbers = gen.floatArray(); // 1000 at a time, by default
```

### Buffer Reuse Behavior
```javascript
const array1 = gen.floatArray(); // Get first batch
// consume first batch ...
const array2 = gen.floatArray(); // Get second batch

// ⚠️ array1 === array2 (same memory buffer!)
// If you need to keep the values around, copy them first:
const saved = new Float64Array(gen.floatArray());
```

## Understanding Performance: Why Array Methods Are Faster

Every time you call a WASM function from the JS runtime, there's overhead involved:

1. **JavaScript → WASM context switch**
2. **Parameter marshaling** (converting JS types to WASM types)
3. **WASM → JavaScript context switch**
4. **Return value conversion** (converting WASM types back to JS types)
5. **V8 engine bookkeeping**

While this overhead is small per call (~50-200 nanoseconds), **it compounds dramatically** when making many calls.

### Single Value Generation: Overhead Dominates

When generating **1 billion random numbers** using `float()`:

```javascript
for (let i = 0; i < 1_000_000_000; i++) {
    const value = gen.float();  // 1B boundary crossings
    // use value...
}
```

**Time breakdown:**
- **WASM boundary crossings:** 1 billion × ~100ns = **~100 seconds**
- **Actual RNG generation:** 1 billion × ~30-50ns = **~30-50 seconds**
- **Total time:** **~130-150 seconds**

**Result:** ~70% of execution time is spent on boundary crossing overhead, only ~30% on actual random number generation!

### Array Generation: Minimize Boundary Crossings

When generating the same **1 billion random numbers** using `floatArray()`:

```javascript
for (let i = 0; i < 1_000_000; i++) {
    const batch = gen.floatArray();  // only 1M boundary crossings
    for (let j = 0; j < 1000) {
        // use batch values...
    }
}
```

**Time breakdown:**
- **WASM boundary crossings:** 1 million × ~100ns = **~0.1 seconds**
- **Actual RNG generation:** 1 billion × ~30-50ns = **~30-50 seconds**
- **Total time:** **~30-50 seconds**

**Result:** ~0.3% boundary crossing overhead, ~99.7% actual work. **This is 3-5× faster overall!**

### Does Array Size Matter?

Yes, but with diminishing returns. Larger arrays mean fewer boundary crossings:

| Array Size | Boundary Crossings (1B numbers) | Overhead Time |
|------------|--------------------------------|---------------|
| 1 (single) | 1 billion | ~100 seconds |
| 100 | 10 million | ~1 second |
| 1,000 (default) | 1 million | ~0.1 seconds |
| 10,000 | 100,000 | ~0.01 seconds |
| 1,000,000 | 1,000 | ~0.0001 seconds |

**However:** The default of 1,000 already reduces overhead to negligible levels (0.3% of total time). Going larger:
- ✅ Saves ~0.1 seconds per billion numbers (tiny improvement)
- ❌ Increases memory usage (8KB → 80KB → 8MB)
- ❌ May hit WASM memory limits
- ❌ No improvement to actual RNG speed


## Troubleshooting

### "Module not found: fast-prng-wasm"
Make sure you've built the library first:
```bash
cd ../..
npm i
npm run build
```

### "Cannot find package 'fast-prng-wasm'"
The example uses a local file dependency. From this directory:
```bash
npm install
```

---

**Need help?** Open an issue: https://github.com/themattspiral/fast-prng-wasm/issues
