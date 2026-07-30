/**
 * assemblyscript-consumer - Bootstrap resampling with fast-prng-wasm
 *
 * A worked example of *why* you'd reach for a fast, high-quality PRNG inside your
 * own AssemblyScript/WASM code: the bootstrap. It estimates the uncertainty of a
 * statistic by resampling the observed data with replacement many times. Each
 * resample here draws N indices, so even a modest number of resamples consumes
 * millions of random draws — and a biased or low-quality generator would skew the
 * resulting confidence interval.
 *
 * Dataset: the classic Efron & Tibshirani "law school" sample (An Introduction to
 * the Bootstrap, 1993) — n = 15 schools, each with an average entrance-exam score
 * (LSAT) and undergraduate grade-point average (GPA). We bootstrap the Pearson
 * correlation between the two. Its standard error has no clean closed form, which
 * is exactly what made it the textbook motivation for the bootstrap.
 *
 * Compiled to WASM by `asc` (see asconfig.json) and driven by index.js.
 */

// `fast-prng-wasm/assembly` re-exports each generator as its own namespace. Every
// generator exports the same function names (float53, uint64, ...), so the
// namespaces are what keep them from colliding. Importing it pulls in the SIMD
// generators too, so compiling requires `--enable simd` (set in asconfig.json).
import { Xoroshiro128Plus } from 'fast-prng-wasm/assembly';

// To compile only one algorithm - and, for the non-SIMD generators, without the
// SIMD flag - import that generator directly instead, e.g.:
//   import * as Xoroshiro128Plus from 'fast-prng-wasm/assembly/prng/xoroshiro128plus';

/**
 * The paired sample: average LSAT score and GPA for 15 U.S. law schools. The two
 * arrays are aligned by index — LSAT[i] and GPA[i] are the same school. (Verified
 * against the CRAN `bootstrap` package's `law` dataset; the sample correlation is
 * 0.7763745.)
 */
const LSAT: StaticArray<f64> = [576, 635, 558, 578, 666, 580, 555, 661, 651, 605, 653, 575, 545, 572, 594];
const GPA:  StaticArray<f64> = [3.39, 3.30, 2.81, 3.03, 3.44, 3.07, 3.00, 3.43, 3.36, 3.13, 3.12, 2.74, 2.76, 2.88, 2.96];
const N: i32 = 15;

// Seed the generator deterministically so this example's output is reproducible.
// setSeeds takes SEED_COUNT (2 for Xoroshiro128+) u64 values; the explicit u64(...)
// form is unambiguous about the intended type (AssemblyScript has no BigInt `123n`
// literal syntax).
Xoroshiro128Plus.setSeeds(u64(0x243F6A8885A308D3), u64(0x13198A2E03707344));

// Results, computed once by run() and exposed through the scalar getters below.
let _observed: f64 = 0;
let _standardError: f64 = 0;
let _ciLow: f64 = 0;
let _ciHigh: f64 = 0;
let _validReplicates: i32 = 0;

/**
 * Pearson correlation from accumulated sums over `n` paired points. Returns NaN
 * when either variable has zero variance (an all-identical resample), which the
 * caller skips.
 */
// @ts-ignore: top level decorators are supported in AssemblyScript
@inline
function correlationFromSums(n: f64, sx: f64, sy: f64, sxx: f64, syy: f64, sxy: f64): f64 {
    const cov = n * sxy - sx * sy;
    const varX = n * sxx - sx * sx;
    const varY = n * syy - sy * sy;
    const denom = varX * varY;
    if (denom <= 0) return NaN;
    return cov / Math.sqrt(denom);
}

/** Pearson correlation of the full observed sample (LSAT vs GPA). */
function observedPearson(): f64 {
    let sx: f64 = 0, sy: f64 = 0, sxx: f64 = 0, syy: f64 = 0, sxy: f64 = 0;
    for (let i = 0; i < N; i++) {
        const x = unchecked(LSAT[i]);
        const y = unchecked(GPA[i]);
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    }
    return correlationFromSums(<f64>N, sx, sy, sxx, syy, sxy);
}

/** Nearest-rank index of percentile `p` (0..1) within a sorted array of `count` values. */
function percentileIndex(p: f64, count: i32): i32 {
    let idx = <i32>Math.round(p * <f64>(count - 1));
    if (idx < 0) idx = 0;
    if (idx >= count) idx = count - 1;
    return idx;
}

/**
 * Runs the bootstrap. Draws `resampleCount` resamples of the 15-point dataset
 * (each N indices, sampled with replacement), computes the Pearson correlation of
 * each, and derives the bootstrap standard error and a 95% percentile confidence
 * interval. Fills the module-level result globals; read them via the getters below.
 *
 * @param resampleCount Number of bootstrap resamples (B). Statistically a few
 * thousand suffices for a stable interval; larger values mostly exercise the
 * generator's throughput.
 */
export function run(resampleCount: i32): void {
    _observed = observedPearson();

    const replicates = new Float64Array(resampleCount);
    let valid = 0;

    for (let b = 0; b < resampleCount; b++) {
        let sx: f64 = 0, sy: f64 = 0, sxx: f64 = 0, syy: f64 = 0, sxy: f64 = 0;
        for (let i = 0; i < N; i++) {
            // Uniform index in [0, N): float53() is in [0, 1), so this is floor for
            // non-negative values. The modulo-style bias is bounded by ~N/2^53 —
            // negligible. This is the hot path: resampleCount * N random draws.
            const idx = <i32>(Xoroshiro128Plus.float53() * <f64>N);
            const x = unchecked(LSAT[idx]);
            const y = unchecked(GPA[idx]);
            sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
        }
        const r = correlationFromSums(<f64>N, sx, sy, sxx, syy, sxy);
        // Skip the astronomically-rare all-identical resample (zero variance -> NaN).
        if (isFinite(r)) {
            unchecked(replicates[valid] = r);
            valid++;
        }
    }

    _validReplicates = valid;

    if (valid == 0) {
        _standardError = NaN;
        _ciLow = NaN;
        _ciHigh = NaN;
        return;
    }

    // Bootstrap standard error = sample standard deviation of the replicates.
    let mean: f64 = 0;
    for (let i = 0; i < valid; i++) mean += unchecked(replicates[i]);
    mean /= <f64>valid;
    let sumSq: f64 = 0;
    for (let i = 0; i < valid; i++) {
        const d = unchecked(replicates[i]) - mean;
        sumSq += d * d;
    }
    _standardError = valid > 1 ? Math.sqrt(sumSq / <f64>(valid - 1)) : 0;

    // 95% percentile interval: sort the replicates and read the 2.5th / 97.5th
    // percentiles. Copy exactly the valid portion so any skipped tail can't sort in.
    const sorted = new Float64Array(valid);
    for (let i = 0; i < valid; i++) unchecked(sorted[i] = replicates[i]);
    sorted.sort((a: f64, b: f64): i32 => a < b ? -1 : (a > b ? 1 : 0));
    _ciLow = unchecked(sorted[percentileIndex(0.025, valid)]);
    _ciHigh = unchecked(sorted[percentileIndex(0.975, valid)]);
}

/** The Pearson correlation of the observed sample (≈ 0.776). */
export function observedCorrelation(): f64 { return _observed; }

/** Bootstrap estimate of the standard error of the correlation. */
export function standardError(): f64 { return _standardError; }

/** Lower bound of the 95% percentile confidence interval. */
export function confidenceLow(): f64 { return _ciLow; }

/** Upper bound of the 95% percentile confidence interval. */
export function confidenceHigh(): f64 { return _ciHigh; }

/** Number of resamples actually used (equals the requested count unless a degenerate one was skipped). */
export function validReplicates(): i32 { return _validReplicates; }

/** The sample size, n. */
export function sampleSize(): i32 { return N; }
