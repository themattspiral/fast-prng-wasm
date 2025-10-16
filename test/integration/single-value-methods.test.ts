/**
 * RandomGenerator Single Value Methods Tests
 *
 * Tests for RandomGenerator single-value generation methods across all PRNG types.
 *
 * Test Strategy:
 * - Validate output ranges for all single-value methods
 * - Verify uniqueness (no duplicate values in reasonable sample sizes)
 * - Test all 5 PRNG types to catch wiring errors or missing exports
 *
 * Contrast: Though conversion logic is shared (conversion.ts), each generator must
 * wire it up correctly. Testing all generators catches wiring errors, missing exports,
 * or wrong conversion function calls. For statistical validation (larger samples,
 * chi-square), see statistical-validation.test.ts. For array-specific behavior
 * (stream consistency, SIMD interleaving), see array-behavior.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { ALL_PRNG_TYPES, INTEGRATION_SAMPLE_SIZE } from '../helpers/test-utils';

describe('RandomGenerator', () => {
    describe('Single-Value Methods', () => {
        ALL_PRNG_TYPES.forEach(prngType => {
            describe(`${PRNGType[prngType]}`, () => {
                describe('int64()', () => {
                    it('should generate values in valid range', () => {
                        const gen = new RandomGenerator(prngType);
                        const value = gen.int64();

                        expect(typeof value).toBe('bigint');
                        expect(value).toBeGreaterThanOrEqual(0n);
                        expect(value).toBeLessThanOrEqual(0xFFFFFFFFFFFFFFFFn);
                    });

                    it('should generate unique values', () => {
                        const gen = new RandomGenerator(prngType);
                        const values = new Set<bigint>();

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            values.add(gen.int64());
                        }

                        expect(values.size).toBe(INTEGRATION_SAMPLE_SIZE);
                    });
                });

                describe('int53()', () => {
                    it('should generate values in valid range', () => {
                        const gen = new RandomGenerator(prngType);
                        const value = gen.int53();

                        expect(typeof value).toBe('number');
                        expect(Number.isInteger(value)).toBe(true);
                        expect(value).toBeGreaterThanOrEqual(0);
                        expect(value).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
                    });

                    it('should generate unique values', () => {
                        const gen = new RandomGenerator(prngType);
                        const values = new Set<number>();

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            values.add(gen.int53());
                        }

                        expect(values.size).toBe(INTEGRATION_SAMPLE_SIZE);
                    });
                });

                describe('int32()', () => {
                    it('should generate values in valid range', () => {
                        const gen = new RandomGenerator(prngType);
                        const value = gen.int32();

                        expect(typeof value).toBe('number');
                        expect(Number.isInteger(value)).toBe(true);
                        expect(value).toBeGreaterThanOrEqual(0);
                        expect(value).toBeLessThanOrEqual(0xFFFFFFFF);
                    });

                    it('should generate unique values', () => {
                        const gen = new RandomGenerator(prngType);
                        const values = new Set<number>();

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            values.add(gen.int32());
                        }

                        expect(values.size).toBe(INTEGRATION_SAMPLE_SIZE);
                    });
                });

                describe('float()', () => {
                    it('should generate values in valid range', () => {
                        const gen = new RandomGenerator(prngType);

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            const value = gen.float();

                            expect(typeof value).toBe('number');
                            expect(value).toBeGreaterThanOrEqual(0);
                            expect(value).toBeLessThan(1);
                        }
                    });

                    it('should generate unique values', () => {
                        const gen = new RandomGenerator(prngType);
                        const values = new Set<number>();

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            values.add(gen.float());
                        }

                        expect(values.size).toBe(INTEGRATION_SAMPLE_SIZE);
                    });
                });

                describe('coord()', () => {
                    it('should generate values in valid range', () => {
                        const gen = new RandomGenerator(prngType);

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            const value = gen.coord();

                            expect(typeof value).toBe('number');
                            expect(value).toBeGreaterThanOrEqual(-1);
                            expect(value).toBeLessThan(1);
                        }
                    });

                    it('should generate unique values', () => {
                        const gen = new RandomGenerator(prngType);
                        const values = new Set<number>();

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            values.add(gen.coord());
                        }

                        expect(values.size).toBe(INTEGRATION_SAMPLE_SIZE);
                    });
                });

                describe('coordSquared()', () => {
                    it('should generate values in valid range', () => {
                        const gen = new RandomGenerator(prngType);

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            const value = gen.coordSquared();

                            expect(typeof value).toBe('number');
                            expect(value).toBeGreaterThanOrEqual(0);
                            expect(value).toBeLessThan(1);
                        }
                    });

                    it('should generate unique values', () => {
                        const gen = new RandomGenerator(prngType);
                        const values = new Set<number>();

                        for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
                            values.add(gen.coordSquared());
                        }

                        expect(values.size).toBe(INTEGRATION_SAMPLE_SIZE);
                    });
                });
            });
        });
    });
});
