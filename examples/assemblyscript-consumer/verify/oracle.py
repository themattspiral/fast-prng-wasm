#!/usr/bin/env python3
"""
Independent reference ("oracle") for the AssemblyScript bootstrap demo.

The demo (../assembly/main.ts) computes a bootstrap standard error, a percentile
confidence interval, and a BCa interval for the LSAT-GPA correlation, all in
AssemblyScript/WASM. Those numbers are non-trivial — BCa needs a normal CDF and its
inverse plus a jackknife — so this script recomputes the same statistics completely
independently, to confirm the WASM results are right rather than just self-consistent.

"Independent" is the point: this is a different language (Python), a different normal
CDF/inverse (the standard library's `statistics.NormalDist`, a different rational
approximation than the demo's Acklam / Zelen-Severo code), and a different random
number generator (Python's `random`). If the AS demo and this script agree, the
agreement is meaningful. `verify.mjs` runs both and compares them.

Two kinds of check come out of this:
  * Deterministic (exact): the observed correlation and the jackknife acceleration
    `a` depend only on the 15 data points, not on any random draws, so they must match
    essentially exactly. These are the strongest checks.
  * Monte Carlo (approximate): the standard error and interval endpoints are estimates
    from random resampling, so the demo and this oracle agree only within sampling
    tolerance (they use different RNGs).

Stdlib only — no numpy/scipy/R required.

Usage:
    python3 oracle.py [B] [--json]
      B        number of bootstrap resamples (default 500000)
      --json   emit one line of JSON (consumed by verify.mjs); otherwise print a table
"""
import math
import random
import sys
from statistics import NormalDist

# Efron & Tibshirani "law school" sample (An Introduction to the Bootstrap, 1993):
# 15 US law schools, each an average LSAT score and undergraduate GPA, aligned by
# index. Same values embedded in the AS demo; sample correlation is 0.7763745.
LSAT = [576, 635, 558, 578, 666, 580, 555, 661, 651, 605, 653, 575, 545, 572, 594]
GPA = [3.39, 3.30, 2.81, 3.03, 3.44, 3.07, 3.00, 3.43, 3.36, 3.13, 3.12, 2.74, 2.76, 2.88, 2.96]
N = len(LSAT)
ND = NormalDist()


def corr_from_sums(n, sx, sy, sxx, syy, sxy):
    """Pearson correlation from accumulated sums; NaN on zero variance."""
    cov = n * sxy - sx * sy
    var_x = n * sxx - sx * sx
    var_y = n * syy - sy * sy
    denom = var_x * var_y
    if denom <= 0:
        return float("nan")
    return cov / math.sqrt(denom)


def pearson(indices):
    """Pearson correlation of the sample selected by `indices` (with replacement)."""
    sx = sy = sxx = syy = sxy = 0.0
    for i in indices:
        x = LSAT[i]
        y = GPA[i]
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y
    return corr_from_sums(len(indices), sx, sy, sxx, syy, sxy)


def type7(sorted_vals, p):
    """Quantile at probability p using type-7 linear interpolation (R / NumPy default)."""
    n = len(sorted_vals)
    if n == 1:
        return sorted_vals[0]
    h = (n - 1) * p
    lo = math.floor(h)
    if lo >= n - 1:
        return sorted_vals[n - 1]
    if lo < 0:
        return sorted_vals[0]
    return sorted_vals[lo] + (h - lo) * (sorted_vals[lo + 1] - sorted_vals[lo])


# Observed statistic: a property of the data alone, so it is deterministic.
OBSERVED = pearson(list(range(N)))


def jackknife_acceleration():
    """
    BCa acceleration `a`: the standardized third moment of the leave-one-out
    correlations of the observed sample. Data-derived, so deterministic. Each
    leave-one-out value comes from subtracting one point from the full-sample sums.
    """
    fsx = sum(LSAT); fsy = sum(GPA)
    fsxx = sum(x * x for x in LSAT); fsyy = sum(y * y for y in GPA)
    fsxy = sum(LSAT[i] * GPA[i] for i in range(N))
    theta = [
        corr_from_sums(N - 1, fsx - LSAT[i], fsy - GPA[i],
                       fsxx - LSAT[i] ** 2, fsyy - GPA[i] ** 2, fsxy - LSAT[i] * GPA[i])
        for i in range(N)
    ]
    mean = sum(theta) / N
    num = sum((mean - t) ** 3 for t in theta)
    den = 6.0 * (sum((mean - t) ** 2 for t in theta)) ** 1.5
    return num / den


ACCEL = jackknife_acceleration()


def run(resamples, seed):
    """Bootstrap the correlation `resamples` times; return SE and both intervals."""
    random.seed(seed)
    replicates = []
    for _ in range(resamples):
        idx = [int(random.random() * N) for _ in range(N)]
        r = pearson(idx)
        if math.isfinite(r):
            replicates.append(r)
    valid = len(replicates)

    mean = sum(replicates) / valid
    se = math.sqrt(sum((r - mean) ** 2 for r in replicates) / (valid - 1))

    ordered = sorted(replicates)
    percentile = (type7(ordered, 0.025), type7(ordered, 0.975))

    # BCa: bias correction z0 (how the replicate median sits vs. the observed value)
    # plus the acceleration shift the percentile levels before reading the quantiles.
    less = sum(1 for r in replicates if r < OBSERVED)
    z0 = ND.inv_cdf(less / valid)

    def endpoint(alpha):
        z_alpha = ND.inv_cdf(alpha)
        adjusted = z0 + (z0 + z_alpha) / (1 - ACCEL * (z0 + z_alpha))
        return type7(ordered, ND.cdf(adjusted))

    bca = (endpoint(0.025), endpoint(0.975))
    return se, percentile, bca, z0, valid


def main():
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    positional = [a for a in sys.argv[1:] if not a.startswith("--")]
    resamples = int(positional[0]) if positional else 500_000
    # Fixed seed so the oracle itself is reproducible run to run.
    se, percentile, bca, z0, valid = run(resamples, seed=20260812)

    result = {
        "observed": OBSERVED,
        "accel": ACCEL,
        "z0": z0,
        "se": se,
        "percentile": list(percentile),
        "bca": list(bca),
        "B": resamples,
        "valid": valid,
        # Anchors that confirm the oracle's own normal functions are the values we
        # expect from a standard normal table (independent of the AS demo).
        "anchors": {
            "invcdf_0.975": ND.inv_cdf(0.975),
            "cdf_1": ND.cdf(1.0),
            "type7_0..9_0.025": type7(list(range(10)), 0.025),
        },
    }

    if "--json" in flags:
        import json
        print(json.dumps(result))
        return

    print(f"Independent bootstrap oracle (Python stdlib), B = {resamples:,}")
    print(f"  observed r = {OBSERVED:.7f}   (deterministic)")
    print(f"  accel a    = {ACCEL:.6f}    (deterministic, data-derived)")
    print(f"  z0         = {z0:.6f}")
    print(f"  SE         = {se:.4f}")
    print(f"  percentile = [{percentile[0]:.4f}, {percentile[1]:.4f}]")
    print(f"  BCa        = [{bca[0]:.4f}, {bca[1]:.4f}]")


if __name__ == "__main__":
    main()
