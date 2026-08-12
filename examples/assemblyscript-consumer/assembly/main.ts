/**
 * assemblyscript-consumer - Bootstrap resampling with fast-prng-wasm
 *
 * A worked example of *why* you'd reach for a fast, high-quality PRNG inside your
 * own AssemblyScript/WASM code: the bootstrap. It estimates how uncertain a
 * statistic is by resampling the observed data with replacement many times. Each
 * resample here draws N indices, so even a modest number of resamples consumes
 * millions of random draws — and a biased or low-quality generator would skew the
 * resulting confidence interval.
 *
 * The same bootstrap is run with two of the library's generators (Xoroshiro128+
 * and PCG) to show the AssemblyScript namespaces coexisting, their differing seed
 * counts, and that quality generators agree on the answer. Two confidence intervals
 * are reported: the percentile interval (simplest, taught first) and BCa
 * (bias-corrected and accelerated) — for a skewed statistic like a correlation they
 * differ visibly, which is the whole reason BCa exists.
 *
 * Dataset: the classic Efron & Tibshirani "law school" sample (An Introduction to
 * the Bootstrap, 1993) — n = 15 schools, each with an average entrance-exam score
 * (LSAT) and undergraduate grade-point average (GPA). We bootstrap the Pearson
 * correlation between the two. Its standard error has no clean closed form, which
 * is exactly what made it the textbook motivation for the bootstrap. Source and
 * license are cited with the data below and echoed by the JS runner.
 *
 * Compiled to WASM by `asc` (see asconfig.json) and driven by index.js.
 */

// `fast-prng-wasm/assembly` re-exports each generator as its own namespace. Every
// generator exports the same function names (float53, uint64, ...), so the
// namespaces are what keep them from colliding. Importing it pulls in the SIMD
// generators too, so compiling requires `--enable simd` (set in asconfig.json).
import { Xoroshiro128Plus, PCG } from 'fast-prng-wasm/assembly';

// To compile only one algorithm - and, for the non-SIMD generators, without the
// SIMD flag - import each generator directly instead, e.g.:
//   import * as Xoroshiro128Plus from 'fast-prng-wasm/assembly/prng/xoroshiro128plus';

// Raw entropy has to come from the host — WASM has no ambient randomness — but the
// seeding otherwise belongs in here. `nextSeed()` is one fresh, high-quality 64-bit
// value per call, supplied by the JS runner (see index.js). `@external("env", ...)`
// binds it under `env`; a bare `declare function` would bind under this module's own
// name and fail to instantiate.
@external("env", "nextSeed")
declare function nextSeed(): u64;

/**
 * The paired sample: average LSAT score and GPA for 15 U.S. law schools. The two
 * arrays are aligned by index — LSAT[i] and GPA[i] are the same school.
 *
 * Source: Efron & Tibshirani, "An Introduction to the Bootstrap" (1993), Table 3.1 —
 * a random sample of 15 of the 82 US law schools in the 1973 entering-class study.
 * Distributed as the `law` dataset in the CRAN `bootstrap` package (BSD-3-Clause);
 * see https://rdrr.io/cran/bootstrap/man/law.html. The 15 numeric pairs are raw
 * facts (not copyrightable), verified against that dataset: the sample Pearson
 * correlation is 0.7763745.
 */
const LSAT: StaticArray<f64> = [576, 635, 558, 578, 666, 580, 555, 661, 651, 605, 653, 575, 545, 572, 594];
const GPA:  StaticArray<f64> = [3.39, 3.30, 2.81, 3.03, 3.44, 3.07, 3.00, 3.43, 3.36, 3.13, 3.12, 2.74, 2.76, 2.88, 2.96];
const N: i32 = 15;

// Seed each generator from the host randomness source, pulling exactly as many
// seeds as it needs (SEED_COUNT: Xoroshiro128+ 2, PCG 1). These top-level calls run
// in the module's start function during WebAssembly.instantiate, when the import is
// already available. Manual seeding stays available too: pass explicit u64 values to
// setSeeds(...) for a fixed, reproducible stream.
Xoroshiro128Plus.setSeeds(nextSeed(), nextSeed());
PCG.setSeeds(nextSeed());

// The observed statistic is a property of the data alone, so it is computed once at
// load and is identical no matter which generator does the resampling.
const OBSERVED: f64 = observedPearson();

// Results of the most recent run(), exposed through the scalar getters below.
let _standardError: f64 = 0;
let _percentileLow: f64 = 0;
let _percentileHigh: f64 = 0;
let _bcaLow: f64 = 0;
let _bcaHigh: f64 = 0;
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

/**
 * Quantile at probability `p` (0..1) of a sorted array, using the type-7 linear
 * interpolation that R's `quantile` and NumPy's `percentile` use by default — so
 * anyone checking these intervals against those tools gets identical numbers.
 */
function type7Quantile(sorted: Float64Array, count: i32, p: f64): f64 {
    if (count == 1) return unchecked(sorted[0]);
    const h = <f64>(count - 1) * p;
    let lo = <i32>Math.floor(h);
    if (lo >= count - 1) return unchecked(sorted[count - 1]);
    if (lo < 0) return unchecked(sorted[0]);
    const frac = h - <f64>lo;
    const a = unchecked(sorted[lo]);
    const b = unchecked(sorted[lo + 1]);
    return a + frac * (b - a);
}

/**
 * Standard normal CDF, Φ(x). Zelen & Severo rational approximation (Abramowitz &
 * Stegun 26.2.17), |error| < 7.5e-8 — ample next to the Monte Carlo error at n = 15.
 * No AssemblyScript stats library provides this, so it is implemented here.
 */
function normalCDF(x: f64): f64 {
    const b1: f64 =  0.319381530;
    const b2: f64 = -0.356563782;
    const b3: f64 =  1.781477937;
    const b4: f64 = -1.821255978;
    const b5: f64 =  1.330274429;
    const p: f64  =  0.2316419;
    const invSqrt2Pi: f64 = 0.3989422804014327;   // 1 / sqrt(2π)
    const ax = Math.abs(x);
    const t = 1.0 / (1.0 + p * ax);
    const pdf = invSqrt2Pi * Math.exp(-0.5 * ax * ax);
    const tail = pdf * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));  // = 1 − Φ(ax)
    return x >= 0 ? 1.0 - tail : tail;
}

/**
 * Inverse standard normal CDF, Φ⁻¹(p). Acklam's rational approximation, relative
 * error < 1.15e-9. Paired with {@link normalCDF} for the BCa endpoint adjustment.
 */
function normalInv(p: f64): f64 {
    const a1: f64 = -3.969683028665376e+01, a2: f64 =  2.209460984245205e+02,
          a3: f64 = -2.759285104469687e+02, a4: f64 =  1.383577518672690e+02,
          a5: f64 = -3.066479806614716e+01, a6: f64 =  2.506628277459239e+00;
    const b1: f64 = -5.447609879822406e+01, b2: f64 =  1.615858368580409e+02,
          b3: f64 = -1.556989798598866e+02, b4: f64 =  6.680131188771972e+01,
          b5: f64 = -1.328068155288572e+01;
    const c1: f64 = -7.784894002430293e-03, c2: f64 = -3.223964580411365e-01,
          c3: f64 = -2.400758277161838e+00, c4: f64 = -2.549732539343734e+00,
          c5: f64 =  4.374664141464968e+00, c6: f64 =  2.938163982698783e+00;
    const d1: f64 =  7.784695709041462e-03, d2: f64 =  3.224671290700398e-01,
          d3: f64 =  2.445134137142996e+00, d4: f64 =  3.754408661907416e+00;
    const pLow: f64 = 0.02425, pHigh: f64 = 1.0 - 0.02425;
    if (p < pLow) {
        const q = Math.sqrt(-2.0 * Math.log(p));
        return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
               ((((d1 * q + d2) * q + d3) * q + d4) * q + 1.0);
    } else if (p <= pHigh) {
        const q = p - 0.5;
        const r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
               (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1.0);
    } else {
        const q = Math.sqrt(-2.0 * Math.log(1.0 - p));
        return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1.0);
    }
}

/**
 * BCa acceleration `a`, estimated by jackknife over the observed sample: the
 * standardized third moment of the leave-one-out correlations. Depends only on the
 * data, so it is the same for every generator and every run. Each leave-one-out
 * correlation is computed by subtracting one point from the full-sample sums.
 */
function jackknifeAcceleration(): f64 {
    let fsx: f64 = 0, fsy: f64 = 0, fsxx: f64 = 0, fsyy: f64 = 0, fsxy: f64 = 0;
    for (let i = 0; i < N; i++) {
        const x = unchecked(LSAT[i]);
        const y = unchecked(GPA[i]);
        fsx += x; fsy += y; fsxx += x * x; fsyy += y * y; fsxy += x * y;
    }
    const theta = new Float64Array(N);
    let mean: f64 = 0;
    for (let i = 0; i < N; i++) {
        const x = unchecked(LSAT[i]);
        const y = unchecked(GPA[i]);
        const t = correlationFromSums(<f64>(N - 1), fsx - x, fsy - y, fsxx - x * x, fsyy - y * y, fsxy - x * y);
        unchecked(theta[i] = t);
        mean += t;
    }
    mean /= <f64>N;
    let num: f64 = 0, den: f64 = 0;
    for (let i = 0; i < N; i++) {
        const d = mean - unchecked(theta[i]);
        num += d * d * d;
        den += d * d;
    }
    return num / (6.0 * Math.pow(den, 1.5));
}

/** One BCa interval endpoint at target level `alpha`, given the bias correction z0. */
function bcaEndpoint(sorted: Float64Array, count: i32, z0: f64, accel: f64, alpha: f64): f64 {
    const zAlpha = normalInv(alpha);
    const adjusted = z0 + (z0 + zAlpha) / (1.0 - accel * (z0 + zAlpha));
    return type7Quantile(sorted, count, normalCDF(adjusted));
}

/**
 * Reduces the bootstrap replicates to the reported statistics: the bootstrap
 * standard error, a 95% percentile interval, and a 95% BCa interval. Fills the
 * module-level result globals; read them via the getters below.
 */
function summarize(replicates: Float64Array, valid: i32): void {
    _validReplicates = valid;
    if (valid == 0) {
        _standardError = NaN;
        _percentileLow = NaN; _percentileHigh = NaN;
        _bcaLow = NaN; _bcaHigh = NaN;
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

    // Sort a copy of exactly the valid portion so any skipped tail can't sort in.
    const sorted = new Float64Array(valid);
    for (let i = 0; i < valid; i++) unchecked(sorted[i] = replicates[i]);
    sorted.sort((a: f64, b: f64): i32 => a < b ? -1 : (a > b ? 1 : 0));

    // Percentile interval: the 2.5th / 97.5th percentiles, read directly.
    _percentileLow = type7Quantile(sorted, valid, 0.025);
    _percentileHigh = type7Quantile(sorted, valid, 0.975);

    // BCa interval: shift the percentile levels by the bias correction z0 (how the
    // replicate median sits relative to the observed statistic) and the acceleration
    // (how the statistic's variance changes with its value). For a skewed statistic
    // these pull the interval off the plain percentiles.
    let less = 0;
    for (let i = 0; i < valid; i++) if (unchecked(replicates[i]) < OBSERVED) less++;
    const z0 = normalInv(<f64>less / <f64>valid);
    const accel = jackknifeAcceleration();
    _bcaLow = bcaEndpoint(sorted, valid, z0, accel, 0.025);
    _bcaHigh = bcaEndpoint(sorted, valid, z0, accel, 0.975);
}

/**
 * Runs the bootstrap with Xoroshiro128+: draws `resampleCount` resamples of the
 * 15-point dataset (each N indices, with replacement), computes each resample's
 * Pearson correlation, and summarizes. The resample loop is the hot path —
 * resampleCount * N random draws.
 */
export function runXoroshiro128Plus(resampleCount: i32): void {
    const replicates = new Float64Array(resampleCount);
    let valid = 0;
    for (let b = 0; b < resampleCount; b++) {
        let sx: f64 = 0, sy: f64 = 0, sxx: f64 = 0, syy: f64 = 0, sxy: f64 = 0;
        for (let i = 0; i < N; i++) {
            // Uniform index in [0, N): float53() is in [0, 1), so this is floor for
            // non-negative values. The modulo-style bias is bounded by ~N/2^53.
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
    summarize(replicates, valid);
}

/**
 * Runs the same bootstrap with PCG. Identical to {@link runXoroshiro128Plus} apart
 * from the generator namespace — kept as its own loop so each generator's draw call
 * is explicit and its timing is measured directly.
 */
export function runPCG(resampleCount: i32): void {
    const replicates = new Float64Array(resampleCount);
    let valid = 0;
    for (let b = 0; b < resampleCount; b++) {
        let sx: f64 = 0, sy: f64 = 0, sxx: f64 = 0, syy: f64 = 0, sxy: f64 = 0;
        for (let i = 0; i < N; i++) {
            const idx = <i32>(PCG.float53() * <f64>N);
            const x = unchecked(LSAT[idx]);
            const y = unchecked(GPA[idx]);
            sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
        }
        const r = correlationFromSums(<f64>N, sx, sy, sxx, syy, sxy);
        if (isFinite(r)) {
            unchecked(replicates[valid] = r);
            valid++;
        }
    }
    summarize(replicates, valid);
}

/** The Pearson correlation of the observed sample (≈ 0.776), a property of the data. */
export function observedCorrelation(): f64 { return OBSERVED; }

/** Bootstrap estimate of the standard error of the correlation. */
export function standardError(): f64 { return _standardError; }

/** Lower bound of the 95% percentile confidence interval. */
export function percentileLow(): f64 { return _percentileLow; }

/** Upper bound of the 95% percentile confidence interval. */
export function percentileHigh(): f64 { return _percentileHigh; }

/** Lower bound of the 95% BCa confidence interval. */
export function bcaLow(): f64 { return _bcaLow; }

/** Upper bound of the 95% BCa confidence interval. */
export function bcaHigh(): f64 { return _bcaHigh; }

/** Number of resamples actually used (equals the requested count unless a degenerate one was skipped). */
export function validReplicates(): i32 { return _validReplicates; }

/** The sample size, n. */
export function sampleSize(): i32 { return N; }
