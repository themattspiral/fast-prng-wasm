/**
 * assemblyscript-consumer - JS runner
 *
 * Instantiates the WASM compiled from assembly/main.ts and drives its bootstrap
 * with two generators. Uses the plain WebAssembly API (no loader): the module
 * computes everything in WASM and exposes results through scalar getters, so no
 * array marshalling is required.
 *
 * The runner's one job beyond driving the run is seeding: it supplies the module a
 * host randomness source (`env.nextSeed`) — high-quality 64-bit values the AS code
 * pulls to seed each generator. WASM has no ambient randomness, so this hop has to
 * come from the host; everything else stays in AssemblyScript.
 *
 * Build the WASM first (see README):  npm run build
 * Then run:                           npm start   (or: node index.js [resamples])
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(here, 'build', 'release.wasm');

/**
 * One fresh, high-quality unsigned 64-bit seed. This mirrors the library's own
 * src/seeds.ts: cryptographic randomness when available (Node 15+, all browsers),
 * with a timing + Math.random() fallback for older environments. It deliberately
 * does NOT expand a single seed via SplitMix64 — this example shows passing raw
 * high-quality entropy straight into the WASM generators. (The library's JS
 * seed64Array() layers SplitMix64 on top; a later revision of this example will
 * show that expansion ported to AssemblyScript.)
 */
function seed64() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const parts = new Uint32Array(2);
        crypto.getRandomValues(parts);
        return (BigInt(parts[0]) << 32n) | BigInt(parts[1]);
    }
    // Fallback: combine timing sources with Math.random(), same as src/seeds.ts.
    const seed32 = () => {
        let entropy = Date.now();
        if (typeof performance !== 'undefined' && performance.now) {
            entropy ^= (performance.now() * 1e6) | 0;
        }
        entropy ^= (Math.random() * 0x100000000) | 0;
        return entropy >>> 0;  // ensure unsigned 32-bit
    };
    return (BigInt(seed32()) << 32n) | BigInt(seed32());
}

let wasmBytes;
try {
    wasmBytes = readFileSync(wasmPath);
} catch {
    console.error(`\nCould not read ${wasmPath}\nDid you compile the WASM first?  npm run build\n`);
    process.exit(1);
}

// The AS module seeds its generators from `env.nextSeed` in its start function,
// during instantiation. `env.abort` surfaces AssemblyScript runtime errors as JS
// errors. No other imports are needed.
const { instance } = await WebAssembly.instantiate(wasmBytes, {
    env: {
        nextSeed: () => seed64(),
        abort(_msg, _file, line, column) {
            throw new Error(`AssemblyScript abort at ${line}:${column}`);
        },
    },
});

const {
    runXoroshiro128Plus, runPCG,
    observedCorrelation, standardError,
    percentileLow, percentileHigh, bcaLow, bcaHigh,
    validReplicates, sampleSize,
} = instance.exports;

// Number of bootstrap resamples per generator. A few thousand already gives a
// stable interval; the large default mainly exercises the generators' throughput.
const resamples = Number(process.argv[2]) || 1_000_000;
const n = sampleSize();
const drawsPer = resamples * n;

console.log('Bootstrapping a correlation with fast-prng-wasm (in AssemblyScript)');
console.log('==================================================================\n');

console.log(
    'A bootstrap asks: given a small sample, how sure can we be about a number\n' +
    'computed from it? It re-draws the sample with replacement many times and\n' +
    'recomputes the number each time; the spread of those answers is the uncertainty.\n' +
    'This runs entirely in WASM — only the final numbers cross back to JS.\n'
);

console.log(`Data:     ${n} US law schools, each an (LSAT score, GPA) pair.`);
console.log('Question: how strong is the LSAT-GPA correlation, and how uncertain is it?\n');

console.log(`Observed correlation r = ${observedCorrelation().toFixed(4)}   (a fixed property of the ${n} data points)\n`);

console.log(
    `Resampling ${resamples.toLocaleString()} times per generator — ${n} index draws each, so\n` +
    `${drawsPer.toLocaleString()} random draws per generator. Every draw picks one of the ${n}\n` +
    'schools; the generators are uniform with no low-order-bit patterning (they pass\n' +
    'BigCrush and PractRand), so no school is favored and the spread is unbiased.\n'
);

// Run each generator, timing just the WASM bootstrap call, and collect a table row.
const rows = [];
for (const [name, run] of [['Xoroshiro128+', runXoroshiro128Plus], ['PCG', runPCG]]) {
    const start = process.hrtime.bigint();
    run(resamples);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    rows.push({
        name,
        se: standardError().toFixed(4),
        pct: `[${percentileLow().toFixed(4)}, ${percentileHigh().toFixed(4)}]`,
        bca: `[${bcaLow().toFixed(4)}, ${bcaHigh().toFixed(4)}]`,
        time: `${elapsedMs.toFixed(0)} ms`,
        valid: validReplicates(),
    });
}

const col = (s, w) => String(s).padEnd(w);
console.log(`${col('Generator', 15)}  ${col('SE', 7)}  ${col('95% percentile CI', 20)}  ${col('95% BCa CI', 20)}  time`);
console.log(`${'-'.repeat(15)}  ${'-'.repeat(7)}  ${'-'.repeat(20)}  ${'-'.repeat(20)}  ${'-'.repeat(8)}`);
for (const r of rows) {
    console.log(`${col(r.name, 15)}  ${col(r.se, 7)}  ${col(r.pct, 20)}  ${col(r.bca, 20)}  ${r.time}`);
}

console.log(
    '\nReading the results:\n' +
    '  SE  - how much r typically wobbles from resample to resample (~0.13 here).\n' +
    '  percentile CI - the simplest interval: the 2.5th-97.5th percentiles of the\n' +
    '        resampled correlations. Taught first, but not the most accurate.\n' +
    '  BCa CI - bias-corrected and accelerated. A correlation is skewed and bounded\n' +
    '        at +/-1, so the plain percentiles are off; BCa corrects for that, which\n' +
    '        is why its lower bound sits below the percentile one. Efron recommends\n' +
    '        BCa for a statistic like this.\n'
);

console.log(
    'Both generators land on the same answer, as quality generators should. The time\n' +
    'column is a rough, this-machine cost — not a benchmark; the library has a separate\n' +
    'benchmark suite for rigorous throughput.\n'
);

console.log(
    'Data: Efron & Tibshirani, "An Introduction to the Bootstrap" (1993), "law" sample\n' +
    '(15 of 82 US law schools, 1973 entering classes), via the CRAN `bootstrap` package\n' +
    '(BSD-3-Clause). https://rdrr.io/cran/bootstrap/man/law.html'
);
