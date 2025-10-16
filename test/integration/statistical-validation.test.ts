import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import {
    chiSquareTest,
    CHI_SQUARE_CRITICAL_VALUES,
    serialCorrelationTest,
    binValuesInRange,
    calculateBinIndex,
    calculateBigIntBinIndex,
    estimatePi,
    SERIAL_CORRELATION_THRESHOLD,
    PI_ESTIMATION_TOLERANCE,
    CHI_SQUARE_BIN_COUNT_DEFAULT,
    CHI_SQUARE_BIN_COUNT_COORD,
    CHI_SQUARE_DF_10_BINS,
    CHI_SQUARE_DF_20_BINS,
    COORDS_PER_POINT,
    PI_ESTIMATION_MULTIPLIER
} from '../helpers/stat-utils';
import { createTestGenerator, getSeedsForPRNG, DEFAULT_OUTPUT_ARRAY_SIZE, TWO_POW_32, TWO_POW_53, TWO_POW_64 } from '../helpers/test-utils';

/**
 * Statistical Validation Tests
 *
 * Comprehensive statistical quality validation using larger sample size with chi-square tests,
 * serial correlation analysis, and Monte Carlo simulation. Tests native output for all
 * algorithms plus derived outputs (conversions tested on one algorithm since logic is shared)
 * and conversions are explicitly tested separately.
 *
 * Contrast with wrapper-api.test.ts (basic smoke tests verifying methods execute) and
 * array-behavior.test.ts (deep array behavior validation across all generators).
 */
describe('Statistical Validation', () => {
    // Chi-square tests have ~5% false failure rate by design,
    // retries + large count reduce this to ~0.0003%
    const UNIFORMITY_RETRY_COUNT = 2;
    const UNIFORMITY_SAMPLES = 1000000;
    const INDEPENDENCE_SAMPLES = 100000; // 100K samples for robust correlation testing (standard error ~0.003)
    const PI_ESTIMATION_SAMPLES = 1000000;

    const ALL_ALGORITHMS = [
        PRNGType.PCG,
        PRNGType.Xoroshiro128Plus,
        PRNGType.Xoroshiro128Plus_SIMD,
        PRNGType.Xoshiro256Plus,
        PRNGType.Xoshiro256Plus_SIMD
    ];

    describe('Native Integer Uniformity Tests - All Algorithms', () => {
        // Test native integer output for all algorithms to validate core PRNG quality.
        // PCG's native output is uint32 (32-bit), while Xoshiro/Xoroshiro output uint64 (64-bit).
        // Testing native output validates the maximum number of random bits each algorithm produces.

        it('PCG: int32() should produce uniform distribution', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = new RandomGenerator(PRNGType.PCG);
            const binCount = CHI_SQUARE_BIN_COUNT_DEFAULT;
            const min = 0;
            const max = TWO_POW_32;

            // Stream values directly into bins without storing array
            const bins = new Array(binCount).fill(0);
            for (let i = 0; i < UNIFORMITY_SAMPLES; i++) {
                const value = gen.int32();
                const binIndex = calculateBinIndex(value, binCount, min, max);
                bins[binIndex]++;
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 9 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_10_BINS]);
        });

        it('Xoroshiro128Plus: int64() should produce uniform distribution', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus);
            const binCount = CHI_SQUARE_BIN_COUNT_DEFAULT;
            const min = 0n;
            const max = TWO_POW_64;

            // Stream values directly into bins without storing array
            const bins = new Array(binCount).fill(0);
            for (let i = 0; i < UNIFORMITY_SAMPLES; i++) {
                const value = gen.int64();
                const binIndex = calculateBigIntBinIndex(value, binCount, min, max);
                bins[binIndex]++;
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 9 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_10_BINS]);
        });

        it('Xoroshiro128Plus_SIMD: int64() should produce uniform distribution', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD);
            const binCount = CHI_SQUARE_BIN_COUNT_DEFAULT;
            const min = 0n;
            const max = TWO_POW_64;

            // Stream values directly into bins without storing array
            // Use array method for SIMD algorithm per documentation recommendations
            const bins = new Array(binCount).fill(0);

            for (let i = 0; i < UNIFORMITY_SAMPLES / DEFAULT_OUTPUT_ARRAY_SIZE; i++) {
                const values = gen.int64Array();
                for (let j = 0; j < values.length; j++) {
                    const binIndex = calculateBigIntBinIndex(values[j], binCount, min, max);
                    bins[binIndex]++;
                }
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 9 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_10_BINS]);
        });

        it('Xoshiro256Plus: int64() should produce uniform distribution', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = new RandomGenerator(PRNGType.Xoshiro256Plus);
            const binCount = CHI_SQUARE_BIN_COUNT_DEFAULT;
            const min = 0n;
            const max = TWO_POW_64;

            // Stream values directly into bins without storing array
            const bins = new Array(binCount).fill(0);
            for (let i = 0; i < UNIFORMITY_SAMPLES; i++) {
                const value = gen.int64();
                const binIndex = calculateBigIntBinIndex(value, binCount, min, max);
                bins[binIndex]++;
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 9 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_10_BINS]);
        });

        it('Xoshiro256Plus_SIMD: int64() should produce uniform distribution', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = new RandomGenerator(PRNGType.Xoshiro256Plus_SIMD);
            const binCount = CHI_SQUARE_BIN_COUNT_DEFAULT;
            const min = 0n;
            const max = TWO_POW_64;

            // Stream values directly into bins without storing array
            // Use array method for SIMD algorithm per documentation recommendations
            const bins = new Array(binCount).fill(0);

            for (let i = 0; i < UNIFORMITY_SAMPLES / DEFAULT_OUTPUT_ARRAY_SIZE; i++) {
                const values = gen.int64Array();
                for (let j = 0; j < values.length; j++) {
                    const binIndex = calculateBigIntBinIndex(values[j], binCount, min, max);
                    bins[binIndex]++;
                }
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 9 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_10_BINS]);
        });
    });

    describe('Float Uniformity Tests', () => {
        // float() is a derived output using shared conversion code (uint64 >>> 11) / 2^53.
        // We only test one algorithm since the conversion logic is identical across all algorithms.
        // The native integer tests above already validate the core PRNG quality for each algorithm.
        
        // floatArray() uniformity is not tested separately - stream consistency tests in
        // array-methods.test.ts already verify identical sequences, proving identical statistical properties.

        it('float() should produce uniform distribution', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = createTestGenerator();
            const binCount = CHI_SQUARE_BIN_COUNT_DEFAULT;
            const min = 0;
            const max = 1;

            // Stream values directly into bins without storing array
            const bins = new Array(binCount).fill(0);
            for (let i = 0; i < UNIFORMITY_SAMPLES; i++) {
                const value = gen.float();
                const binIndex = calculateBinIndex(value, binCount, min, max);
                bins[binIndex]++;
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 9 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_10_BINS]);
        });
    });

    describe('Coordinate Uniformity Tests', () => {
        // coord() is a linear transformation of float()'s 53-bit extraction (value * 2 - 1).
        // Since native integer uniformity is validated for all algorithms, we only test one algorithm
        // here to verify the transformation logic doesn't introduce bias.

        // coordArray() uniformity is not tested separately - stream consistency tests in
        // array-methods.test.ts already verify identical sequences, proving identical statistical properties.

        // Note: coordSquared() is intentionally NOT uniform - squaring biases values toward 0.

        it('coord() should produce uniform distribution in [-1, 1)', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = createTestGenerator();
            const binCount = CHI_SQUARE_BIN_COUNT_COORD;
            const min = -1;
            const max = 1;

            // Stream values directly into bins without storing array
            const bins = new Array(binCount).fill(0);
            for (let i = 0; i < UNIFORMITY_SAMPLES; i++) {
                const value = gen.coord();
                const binIndex = calculateBinIndex(value, binCount, min, max);
                bins[binIndex]++;
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 19 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_20_BINS]);
        });
    });

    describe('Derived Integer Uniformity Tests', () => {
        // int53() uses shared conversion code (uint64 >>> 11) - same bit extraction as float().
        // We only test one algorithm since conversion logic is identical across all algorithms.
        // Native integer tests above already validate core PRNG quality for each algorithm.

        // int32Array() and int53Array() uniformity is not tested separately - stream consistency tests in
        // array-methods.test.ts already verify identical sequences, proving identical statistical properties.

        it('int53() should produce uniform distribution', { retry: UNIFORMITY_RETRY_COUNT }, () => {
            const gen = createTestGenerator();
            const binCount = CHI_SQUARE_BIN_COUNT_DEFAULT;
            const min = 0;
            const max = TWO_POW_53;

            // Stream values directly into bins without storing array
            const bins = new Array(binCount).fill(0);
            for (let i = 0; i < UNIFORMITY_SAMPLES; i++) {
                const value = gen.int53();
                const binIndex = calculateBinIndex(value, binCount, min, max);
                bins[binIndex]++;
            }

            const expected = UNIFORMITY_SAMPLES / binCount;
            const chiSquare = chiSquareTest(bins, expected);

            // 95% confidence for 9 degrees of freedom
            expect(chiSquare).toBeLessThan(CHI_SQUARE_CRITICAL_VALUES[CHI_SQUARE_DF_10_BINS]);
        });
    });

    describe('Independence Tests - All Algorithms', () => {
        // Test independence for all algorithms since correlation issues could be algorithm-specific
        for (const algo of ALL_ALGORITHMS) {
            it(`${algo}: float() values should have low serial correlation`, () => {
                const gen = new RandomGenerator(algo);

                const values = [];
                for (let i = 0; i < INDEPENDENCE_SAMPLES; i++) {
                    values.push(gen.float());
                }

                const correlation = serialCorrelationTest(values);

                // Correlation should be close to 0 (accept between -0.05 and 0.05)
                expect(Math.abs(correlation)).toBeLessThan(SERIAL_CORRELATION_THRESHOLD);
            });

            it(`${algo}: coord() values should have low serial correlation`, () => {
                const gen = new RandomGenerator(algo);

                const values = [];
                for (let i = 0; i < INDEPENDENCE_SAMPLES; i++) {
                    values.push(gen.coord());
                }

                const correlation = serialCorrelationTest(values);

                // Correlation should be close to 0
                expect(Math.abs(correlation)).toBeLessThan(SERIAL_CORRELATION_THRESHOLD);
            });

            it(`${algo}: coordSquared() values should have low serial correlation`, () => {
                const gen = new RandomGenerator(algo);

                const values = [];
                for (let i = 0; i < INDEPENDENCE_SAMPLES; i++) {
                    values.push(gen.coordSquared());
                }

                const correlation = serialCorrelationTest(values);

                // Correlation should be close to 0
                expect(Math.abs(correlation)).toBeLessThan(SERIAL_CORRELATION_THRESHOLD);
            });
        }
    });

    describe('Monte Carlo π Estimation - All Algorithms', () => {
        for (const algo of ALL_ALGORITHMS) {
            it(`${algo}: should estimate π accurately using coordArray()`, () => {
                const gen = new RandomGenerator(algo);

                // Stream coordinate pairs directly for π estimation without storing full array
                let insideCircle = 0;
                const batchCount = PI_ESTIMATION_SAMPLES * COORDS_PER_POINT / DEFAULT_OUTPUT_ARRAY_SIZE;

                for (let i = 0; i < batchCount; i++) {
                    const coords = gen.coordArray();
                    for (let j = 0; j < coords.length; j += COORDS_PER_POINT) {
                        const x = coords[j];
                        const y = coords[j + 1];
                        if (x * x + y * y <= 1) {
                            insideCircle++;
                        }
                    }
                }

                const piEstimate = PI_ESTIMATION_MULTIPLIER * insideCircle / PI_ESTIMATION_SAMPLES;

                // Should be within 0.01 of π (very high probability)
                expect(Math.abs(piEstimate - Math.PI)).toBeLessThan(PI_ESTIMATION_TOLERANCE);
            });

            it(`${algo}: should estimate π accurately using batchTestUnitCirclePoints()`, () => {
                const gen = new RandomGenerator(algo);

                const insideCircle = gen.batchTestUnitCirclePoints(PI_ESTIMATION_SAMPLES);
                const piEstimate = PI_ESTIMATION_MULTIPLIER * insideCircle / PI_ESTIMATION_SAMPLES;

                // Should be within 0.01 of π
                expect(Math.abs(piEstimate - Math.PI)).toBeLessThan(PI_ESTIMATION_TOLERANCE);
            });

            it(`${algo}: batchTestUnitCirclePoints() should match manual calculation`, () => {
                const seeds = getSeedsForPRNG(algo);
                const gen1 = new RandomGenerator(algo, seeds);
                const gen2 = new RandomGenerator(algo, seeds);

                const pointCount = DEFAULT_OUTPUT_ARRAY_SIZE * 10;

                // Method 1: Use batch test
                const insideCircle1 = gen1.batchTestUnitCirclePoints(pointCount);

                // Method 2: Manual calculation
                let insideCircle2 = 0;

                for (let batch = 0; batch < pointCount * COORDS_PER_POINT / DEFAULT_OUTPUT_ARRAY_SIZE; batch++) {
                    const coords = gen2.coordArray();

                    for (let i = 0; i < coords.length; i += COORDS_PER_POINT) {
                        const x = coords[i];
                        const y = coords[i + 1];

                        if (x * x + y * y <= 1) {
                            insideCircle2++;
                        }
                    }
                }

                // Both methods should give same result
                expect(insideCircle1).toBe(insideCircle2);
            });
        }
    });

});
