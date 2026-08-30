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

This overhead is small per call, but it **compounds dramatically** when you make many calls.

### Single Value Generation: Overhead Dominates

Generating a large batch one value at a time crosses the JS/WASM boundary once per number:

```javascript
for (let i = 0; i < 1_000_000_000; i++) {
    const value = gen.float();  // 1B boundary crossings
    // use value...
}
```

At this scale the boundary crossings (rather than the random-number generation itself) dominate the time.

### Array Generation: Minimize Boundary Crossings

An array method fills many values per call, so the same billion numbers cross the boundary far fewer times:

```javascript
for (let i = 0; i < 1_000_000; i++) {
    const batch = gen.floatArray();  // 1000 numbers per call → only 1M crossings
    for (let j = 0; j < batch.length; j++) {
        // use batch values...
    }
}
```

Now almost all of the time goes to generating numbers rather than crossing the boundary, so the array methods run several times faster overall. The example prints the measured speedup on your machine.

### Does Array Size Matter?

Yes, but with diminishing returns. A larger array means fewer boundary crossings per billion numbers:

| Array Size | Boundary Crossings (per 1B numbers) |
|------------|-------------------------------------|
| 1 (single) | 1 billion |
| 100 | 10 million |
| 1,000 (default) | 1 million |
| 10,000 | 100,000 |
| 1,000,000 | 1,000 |

The default of 1,000 already brings the crossing count low enough that the overhead is negligible for most use cases; going larger yields little further benefit and uses more memory.

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
