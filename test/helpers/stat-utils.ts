/**
 * Statistical Test Utilities
 *
 * Shared constants and functions for statistical validation of PRNGs.
 * Used primarily by statistical-validation.test.ts and seed-randomization.test.ts.
 */

// ============================================================================
// Chi-Square Test Constants
// ============================================================================

/**
 * Default bin count for chi-square uniformity tests.
 * Using 10 bins provides good balance between granularity and statistical power.
 */
export const CHI_SQUARE_BIN_COUNT_DEFAULT = 10;

/**
 * Bin count for coordinate uniformity tests (range [-1, 1)).
 * Using 20 bins for the larger coordinate range provides better resolution.
 */
export const CHI_SQUARE_BIN_COUNT_COORD = 20;

/**
 * Degrees of freedom for chi-square test with 10 bins (10 - 1 = 9).
 * Used to look up critical values for hypothesis testing.
 */
export const CHI_SQUARE_DF_10_BINS = 9;

/**
 * Degrees of freedom for chi-square test with 20 bins (20 - 1 = 19).
 * Used to look up critical values for hypothesis testing.
 */
export const CHI_SQUARE_DF_20_BINS = 19;

/**
 * Critical values for chi-square test at 95% confidence level (α = 0.05).
 * Maps degrees of freedom (bins - 1) to critical chi-square value.
 *
 * If chi-square statistic > critical value, reject null hypothesis (distribution is not uniform).
 */
export const CHI_SQUARE_CRITICAL_VALUES: Record<number, number> = {
    9: 16.92,   // 10 bins
    19: 30.14,  // 20 bins
    49: 66.34,  // 50 bins
    99: 123.23, // 100 bins
};

// ============================================================================
// Serial Correlation Test Constants
// ============================================================================

/**
 * Serial correlation threshold for independence tests.
 * Values with |correlation| < this threshold are considered independent.
 *
 * With 100K samples (INDEPENDENCE_SAMPLES), standard error ~0.003, so 0.05 threshold
 * provides ~17× margin, giving very high confidence (>99.9%) that values below
 * threshold represent true independence.
 */
export const SERIAL_CORRELATION_THRESHOLD = 0.05;

// ============================================================================
// Quartile Distribution Test Constants
// ============================================================================

/**
 * Quartile boundaries for dividing samples into four equal parts.
 * Used in smoke tests to verify basic distribution spread.
 */
export const QUARTILE_1_BOUNDARY = 0.25;
export const QUARTILE_2_BOUNDARY = 0.5;
export const QUARTILE_3_BOUNDARY = 0.75;

/**
 * Tolerance bounds for loose quartile distribution tests.
 * With 1000 samples (seed-randomization.test.ts), expect ~250 per quartile.
 * Using 40% tolerance (150-350) provides >95% confidence for randomized tests.
 *
 * Note: This is NOT used for comprehensive statistical validation
 * (see statistical-validation.test.ts which uses chi-square tests with 1M samples).
 */
export const QUARTILE_LOOSE_LOWER_BOUND = 150;
export const QUARTILE_LOOSE_UPPER_BOUND = 350;

// ============================================================================
// Monte Carlo Test Constants
// ============================================================================

/**
 * Number of coordinates per point for Monte Carlo tests (x, y pairs).
 */
export const COORDS_PER_POINT = 2;

/**
 * Multiplier for estimating π from circle test ratio.
 * π ≈ 4 × (points inside circle / total points)
 */
export const PI_ESTIMATION_MULTIPLIER = 4;

/**
 * Tolerance for Monte Carlo π estimation tests.
 * With 1M samples (PI_ESTIMATION_SAMPLES), standard error ~0.0016.
 * Tolerance of ±0.01 represents ~6.25× standard error, providing >99.9% confidence.
 */
export const PI_ESTIMATION_TOLERANCE = 0.01;

// ============================================================================
// Statistical Test Functions
// ============================================================================

/**
 * Performs a chi-square test for uniformity on a set of bins.
 *
 * This test determines whether observed frequencies differ significantly
 * from expected frequencies. A higher chi-square value indicates worse uniformity.
 *
 * @param observed Array of observed frequencies for each bin
 * @param expected Expected frequency for each bin (should be equal for uniform distribution)
 * @returns Chi-square statistic
 */
export function chiSquareTest(observed: number[], expected: number): number {
    let chiSquare = 0;

    for (let i = 0; i < observed.length; i++) {
        const diff = observed[i] - expected;
        chiSquare += (diff * diff) / expected;
    }

    return chiSquare;
}

/**
 * Performs a serial correlation test to check for independence between consecutive values.
 *
 * Returns correlation coefficient between -1 and 1. Values close to 0 indicate no
 * correlation (good). Positive values indicate positive correlation, negative values
 * indicate negative correlation.
 *
 * @param values Array of numbers to test
 * @returns Correlation coefficient between -1 and 1
 * @throws Error if fewer than 2 values provided
 */
export function serialCorrelationTest(values: number[]): number {
    const n = values.length;

    if (n < 2) {
        throw new Error('Need at least 2 values for serial correlation test');
    }

    // Calculate means
    let mean1 = 0, mean2 = 0;
    for (let i = 0; i < n - 1; i++) {
        mean1 += values[i];
        mean2 += values[i + 1];
    }
    mean1 /= (n - 1);
    mean2 /= (n - 1);

    // Calculate correlation
    let numerator = 0;
    let denom1 = 0, denom2 = 0;

    for (let i = 0; i < n - 1; i++) {
        const diff1 = values[i] - mean1;
        const diff2 = values[i + 1] - mean2;

        numerator += diff1 * diff2;
        denom1 += diff1 * diff1;
        denom2 += diff2 * diff2;
    }

    return numerator / Math.sqrt(denom1 * denom2);
}

/**
 * Calculates which bin a value falls into for a given range.
 *
 * @param value The value to bin
 * @param binCount Total number of bins
 * @param min Minimum value of the range (inclusive)
 * @param max Maximum value of the range (exclusive)
 * @returns The bin index (0 to binCount-1)
 */
export function calculateBinIndex(value: number, binCount: number, min: number, max: number): number {
    const binWidth = (max - min) / binCount;
    return Math.min(Math.floor((value - min) / binWidth), binCount - 1);
}

/**
 * Calculates which bin a BigInt value falls into for a given range.
 *
 * @param value The BigInt value to bin
 * @param binCount Total number of bins
 * @param min Minimum value of the range (inclusive)
 * @param max Maximum value of the range (exclusive)
 * @returns The bin index (0 to binCount-1)
 */
export function calculateBigIntBinIndex(value: bigint, binCount: number, min: bigint, max: bigint): number {
    const range = max - min;
    const binCountBigInt = BigInt(binCount);
    const binWidth = range / binCountBigInt;
    let binIndex = Number((value - min) / binWidth);

    // Clamp to last bin if at max value
    if (binIndex >= binCount) {
        binIndex = binCount - 1;
    }

    return binIndex;
}
