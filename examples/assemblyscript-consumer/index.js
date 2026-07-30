/**
 * assemblyscript-consumer - JS runner
 *
 * Instantiates the WASM compiled from assembly/main.ts and drives its bootstrap.
 * Uses the plain WebAssembly API (no loader): the module computes everything in
 * WASM and exposes the results through scalar getters, so no array marshalling is
 * required.
 *
 * Build the WASM first (see README):  npm run build
 * Then run:                           npm start   (or: node index.js [resamples])
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(here, 'build', 'release.wasm');

let wasmBytes;
try {
    wasmBytes = readFileSync(wasmPath);
} catch {
    console.error(`\nCould not read ${wasmPath}\nDid you compile the WASM first?  npm run build\n`);
    process.exit(1);
}

// AssemblyScript emits an `env.abort` import for runtime errors; surface it as a
// thrown JS error. No other imports are needed by this module.
const { instance } = await WebAssembly.instantiate(wasmBytes, {
    env: {
        abort(_msg, _file, line, column) {
            throw new Error(`AssemblyScript abort at ${line}:${column}`);
        }
    }
});

const {
    run, observedCorrelation, standardError, confidenceLow, confidenceHigh, validReplicates, sampleSize
} = instance.exports;

// Number of bootstrap resamples. A few thousand already gives a stable interval;
// the large default mainly shows off how fast the generator feeds the resampling.
const resamples = Number(process.argv[2]) || 1_000_000;

console.log('Bootstrap: Pearson correlation of LSAT vs GPA across law schools');
console.log('(Efron & Tibshirani "law school" data, direct from AssemblyScript)\n');

// run() computes the observed statistic and the bootstrap results together.
const draws = resamples * sampleSize();
const start = process.hrtime.bigint();
run(resamples);
const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

console.log(`Sample size:                  ${sampleSize()} schools`);
console.log(`Observed correlation:         ${observedCorrelation().toFixed(4)}`);

console.log(`\nResampled ${resamples.toLocaleString()} times (${draws.toLocaleString()} random draws)`);
console.log(`  in ${elapsedMs.toFixed(0)} ms  —  ${(draws / elapsedMs / 1e3).toFixed(1)}M draws/sec\n`);

console.log(`Bootstrap standard error:     ${standardError().toFixed(4)}`);
console.log(`95% percentile interval:      [${confidenceLow().toFixed(4)}, ${confidenceHigh().toFixed(4)}]`);

console.log(
    `\nThe interval is wide but well clear of 0: with only ${sampleSize()} schools the\n` +
    `correlation is clearly positive, yet its magnitude stays uncertain. The bootstrap\n` +
    `quantifies that uncertainty with no formula for the correlation's standard error —\n` +
    `it just needs a lot of high-quality random draws, which is what this library provides.`
);
