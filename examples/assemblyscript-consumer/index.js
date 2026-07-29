/**
 * assemblyscript-consumer - JS runner
 *
 * Instantiates the WASM compiled from assembly/main.ts and calls its exports.
 * Uses the plain WebAssembly API (no loader): every export here returns a scalar
 * (number or bigint), so no array-marshalling glue is required.
 *
 * Build the WASM first (see README):  npm run build
 * Then run:                           npm start
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

const { randomFloat, randomInt, randomCoord, estimatePi, sumRandomFloats } = instance.exports;

console.log('fast-prng-wasm consumed directly from AssemblyScript\n');

console.log('Random float [0, 1):  ', randomFloat());
console.log('Random int (u64):     ', randomInt());
console.log('Random coord [-1, 1): ', randomCoord());

const size = 1000;
const sum = sumRandomFloats(size);
console.log(`\nBulk fill: mean of ${size} floats = ${(sum / size).toFixed(5)} (expected ~0.5)`);

const samples = 1_000_000;
const pi = estimatePi(samples);
console.log(`\nMonte Carlo pi over ${samples.toLocaleString()} samples: ${pi.toFixed(6)}`);
console.log(`Error vs Math.PI: ${Math.abs(pi - Math.PI).toFixed(6)}`);
