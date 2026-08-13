/**
 * verify.mjs - cross-check the AssemblyScript bootstrap demo against an independent
 * reference.
 *
 * This is the demo's "show our work": it instantiates the compiled WASM
 * (../build/release.wasm), runs the bootstrap with both generators through the
 * demo's public exports, and compares the results to oracle.py — a completely
 * independent Python-stdlib implementation (different language, different normal
 * CDF/inverse, different RNG). See oracle.py for why that independence matters.
 *
 * It only uses the demo's shipped exports (runXoroshiro128Plus / runPCG and the
 * scalar getters); it deliberately does not add test-only hooks to the demo. The
 * full bootstrap pipeline runs the normal functions, the type-7 quantile, and the
 * jackknife internally, so end-to-end agreement validates all of them. (To check
 * those pieces one at a time, temporarily export them from main.ts and compare to
 * oracle.py's anchors — that is how they were validated during development.)
 *
 * NOT part of CI or `npm start` — it needs python3 and runs two large bootstraps.
 * Run it by hand after building:
 *     npm run build            # from the example root, produces build/release.wasm
 *     node verify/verify.mjs   # optional: node verify/verify.mjs <resamples>
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(here, '..', 'build', 'release.wasm');
const oraclePath = join(here, 'oracle.py');

// Resamples per generator. Matched between the WASM run and the oracle so their
// Monte Carlo error is comparable; the deterministic checks don't depend on it.
const resamples = Number(process.argv[2]) || 500_000;

// Tolerances. The observed correlation and acceleration are deterministic (exact
// match); the standard error and interval endpoints are Monte Carlo estimates from
// two different RNGs, so they only agree within sampling noise.
const EXACT_TOL = 1e-5;
const SE_TOL = 0.01;
const ENDPOINT_TOL = 0.02;

// Same high-quality seeding the demo's runner uses: raw crypto entropy per call.
function seed64() {
    const parts = new Uint32Array(2);
    crypto.getRandomValues(parts);
    return (BigInt(parts[0]) << 32n) | BigInt(parts[1]);
}

let wasmBytes;
try {
    wasmBytes = readFileSync(wasmPath);
} catch {
    console.error(`\nCould not read ${wasmPath}\nBuild the demo first:  npm run build\n`);
    process.exit(1);
}

let oracle;
try {
    const out = execFileSync('python3', [oraclePath, String(resamples), '--json'], { encoding: 'utf8' });
    oracle = JSON.parse(out);
} catch (err) {
    console.error(`\nCould not run the Python oracle (python3 ${oraclePath}).`);
    console.error('This check needs python3 (standard library only).\n');
    console.error(String(err.message || err));
    process.exit(1);
}

const { instance } = await WebAssembly.instantiate(wasmBytes, {
    env: {
        nextSeed: () => seed64(),
        abort(_msg, _file, line, column) { throw new Error(`AssemblyScript abort at ${line}:${column}`); },
    },
});
const wasm = instance.exports;

const checks = [];
const record = (label, got, want, tol, kind) => {
    const pass = Math.abs(got - want) <= tol;
    checks.push({ label, got, want, tol, kind, pass });
};

// Run each generator through the public exports and gather its reported statistics.
function runGenerator(name, run) {
    run(resamples);
    return {
        name,
        observed: wasm.observedCorrelation(),
        se: wasm.standardError(),
        pctLow: wasm.percentileLow(),
        pctHigh: wasm.percentileHigh(),
        bcaLow: wasm.bcaLow(),
        bcaHigh: wasm.bcaHigh(),
    };
}

for (const [name, run] of [['Xoroshiro128+', wasm.runXoroshiro128Plus], ['PCG', wasm.runPCG]]) {
    const r = runGenerator(name, run);
    record(`${name}: observed r`, r.observed, oracle.observed, EXACT_TOL, 'exact');
    record(`${name}: SE`, r.se, oracle.se, SE_TOL, 'MC');
    record(`${name}: percentile low`, r.pctLow, oracle.percentile[0], ENDPOINT_TOL, 'MC');
    record(`${name}: percentile high`, r.pctHigh, oracle.percentile[1], ENDPOINT_TOL, 'MC');
    record(`${name}: BCa low`, r.bcaLow, oracle.bca[0], ENDPOINT_TOL, 'MC');
    record(`${name}: BCa high`, r.bcaHigh, oracle.bca[1], ENDPOINT_TOL, 'MC');
}

console.log(`Cross-checking the AS demo against the independent Python oracle (B = ${resamples.toLocaleString()})\n`);
console.log(`Oracle: observed r=${oracle.observed.toFixed(7)}  accel a=${oracle.accel.toFixed(6)}` +
    `  SE=${oracle.se.toFixed(4)}  percentile=[${oracle.percentile.map(v => v.toFixed(4)).join(', ')}]` +
    `  BCa=[${oracle.bca.map(v => v.toFixed(4)).join(', ')}]\n`);

for (const c of checks) {
    const flag = c.pass ? 'PASS' : 'FAIL';
    console.log(`${flag}  ${c.label.padEnd(28)} got=${c.got.toFixed(4)}  want=${c.want.toFixed(4)}` +
        `  (${c.kind}, tol ${c.tol})`);
}

const failed = checks.filter(c => !c.pass);
console.log(`\n${failed.length === 0 ? 'ALL CHECKS PASS' : `*** ${failed.length} CHECK(S) FAILED ***`}` +
    `  (${checks.length - failed.length}/${checks.length})`);
process.exit(failed.length === 0 ? 0 : 1);
