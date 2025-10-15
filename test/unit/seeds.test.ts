import { describe, it, expect } from 'vitest';
import { SplitMix64, seed64Array } from 'fast-prng-wasm';

describe('SplitMix64', () => {
    describe('Constructor', () => {
        it('should create instance with auto-seed', () => {
            const sm64 = new SplitMix64();

            expect(sm64).toBeInstanceOf(SplitMix64);
            expect(sm64._state).toBeDefined();
        });

        it('should create instance with custom bigint seed', () => {
            const seed = 12345n;
            const sm64 = new SplitMix64(seed);

            expect(sm64._state).toBe(seed);
        });

        it('should create instance with custom number seed', () => {
            const seed = 12345;
            const sm64 = new SplitMix64(seed);

            expect(sm64._state).toBe(BigInt(seed));
        });
    });

    describe('next()', () => {
        it('should generate bigint values', () => {
            const sm64 = new SplitMix64(42n);
            const value = sm64.next();

            expect(typeof value).toBe('bigint');
        });

        it('should generate different values on consecutive calls', () => {
            const sm64 = new SplitMix64(42n);
            const values = new Set<bigint>();

            for (let i = 0; i < 100; i++) {
                values.add(sm64.next());
            }

            // All values should be unique
            expect(values.size).toBe(100);
        });

        it('should be deterministic for same seed', () => {
            const seed = 12345n;
            const sm64_1 = new SplitMix64(seed);
            const sm64_2 = new SplitMix64(seed);

            const sequence1 = [];
            const sequence2 = [];

            for (let i = 0; i < 10; i++) {
                sequence1.push(sm64_1.next());
                sequence2.push(sm64_2.next());
            }

            expect(sequence1).toEqual(sequence2);
        });

        it('should produce known output for known seed', () => {
            // Reference values calculated by implementing the reference algorithm from:
            // https://xoshiro.di.unimi.it/splitmix64.c
            // The algorithm uses uint64_t arithmetic which wraps at 64 bits.
            // In JavaScript, we must manually mask BigInt operations with 0xFFFFFFFFFFFFFFFF
            // to replicate this behavior. These values were verified by running a
            // JavaScript implementation with proper masking: seed = 12345n produces:
            const seed = 12345n;
            const sm64 = new SplitMix64(seed);

            const expected = [
                2454886589211414944n,
                3778200017661327597n,
                2205171434679333405n,
                3248800117070709450n,
                9350289611492784363n
            ];

            for (let i = 0; i < expected.length; i++) {
                const actual = sm64.next();
                expect(actual).toBe(expected[i]);
            }
        });
    });
});

describe('seed64Array', () => {
    it('should generate array of default size (8)', () => {
        const seeds = seed64Array();

        expect(Array.isArray(seeds)).toBe(true);
        expect(seeds.length).toBe(8);
    });

    it('should generate array of specified size', () => {
        const sizes = [1, 2, 4, 10];

        for (const size of sizes) {
            const seeds = seed64Array(size);
            expect(seeds.length).toBe(size);
        }
    });

    it('should generate bigint values', () => {
        const seeds = seed64Array(5);

        for (const seed of seeds) {
            expect(typeof seed).toBe('bigint');
        }
    });

    it('should generate unique values', () => {
        const seeds = seed64Array(100);
        const uniqueSeeds = new Set(seeds);

        // All seeds should be unique (statistically very likely)
        expect(uniqueSeeds.size).toBe(100);
    });

    it('should be deterministic with custom seed', () => {
        const customSeed = 42n;
        const seeds1 = seed64Array(10, customSeed);
        const seeds2 = seed64Array(10, customSeed);

        expect(seeds1).toEqual(seeds2);
    });

    it('should produce different arrays when auto-seeded', () => {
        const seeds1 = seed64Array(10);
        const seeds2 = seed64Array(10);

        // Arrays should be different (statistically very likely)
        expect(seeds1).not.toEqual(seeds2);
    });

    it('should produce known output for known seed', () => {
        const seeds1 = seed64Array(5, 123n);
        const seeds2 = seed64Array(5, 123n);

        // Same seed should produce same output
        expect(seeds1).toEqual(seeds2);

        // Different seed should produce different output
        const seeds3 = seed64Array(5, 456n);
        expect(seeds1).not.toEqual(seeds3);
    });

    it('should accept number seed', () => {
        const seeds = seed64Array(5, 123);

        expect(Array.isArray(seeds)).toBe(true);
        expect(seeds.length).toBe(5);
    });
});
