# verify/ — showing our work

The demo in this example computes a bootstrap **standard error**, a **percentile**
confidence interval, and a **BCa** (bias-corrected and accelerated) interval for the
LSAT–GPA correlation — entirely in AssemblyScript/WASM. BCa in particular is not
trivial: it needs a normal CDF and its inverse plus a jackknife, all implemented from
scratch in `../assembly/main.ts`. So how do we know those numbers are right?

This folder answers that: it recomputes the same statistics **independently** and
checks that the demo agrees.

## The two pieces

- **`oracle.py`** — an independent reference, Python standard library only. It is
  independent in three ways that matter:
  - a **different language** (Python, not AssemblyScript);
  - a **different normal CDF / inverse** — `statistics.NormalDist`, a different
    rational approximation than the demo's Acklam / Zelen–Severo code;
  - a **different RNG** — Python's `random`, not this library's generators.

  Because nothing is shared with the demo, agreement is real evidence rather than two
  copies of the same possible mistake.

- **`verify.mjs`** — instantiates the compiled WASM, runs the bootstrap with both
  generators **through the demo's public exports only**, runs `oracle.py`, and
  compares. It adds no test-only hooks to the demo; the full pipeline exercises the
  normal functions, the type-7 quantile, and the jackknife internally, so end-to-end
  agreement validates all of them.

## What gets checked

- **Deterministic (exact match):** the observed correlation (`0.7763745`) and the
  jackknife acceleration (`a = −0.075672`) depend only on the 15 data points, so they
  must match essentially exactly. These are the strongest checks.
- **Monte Carlo (within tolerance):** the standard error and the interval endpoints
  are estimates from random resampling. The demo and the oracle use different RNGs, so
  they agree only within sampling noise — the tolerances in `verify.mjs` account for
  that.

## Running it

```sh
npm run build          # from the example root, produces build/release.wasm
node verify/verify.mjs # optional: node verify/verify.mjs <resamples>   (default 500000)
```

`verify.mjs` exits non-zero if any check fails. `oracle.py` can also be run on its own
for a human-readable table:

```sh
python3 verify/oracle.py            # or: python3 verify/oracle.py <resamples>
```

## Notes

- **Requires `python3`** (standard library only — no numpy/scipy/R).
- **Not part of CI or `npm start`.** It runs two large bootstraps and depends on
  python3, and its Monte Carlo comparisons are tolerance-based; that belongs in a
  manual "show our work" check, not the example's smoke test.
- To validate the AS normal functions / quantile / jackknife **one at a time**,
  temporarily export them from `main.ts` and compare against the anchors `oracle.py`
  prints (`invcdf(0.975)`, `cdf(1)`, `type7([0..9], 0.025)`). That is how they were
  checked during development; the temporary exports are removed from the shipped demo.
