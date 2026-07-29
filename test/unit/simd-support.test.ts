/**
 * Unit tests for the WASM SIMD support detection module.
 *
 * `isSimdSupported()` is exercised against a mocked `WebAssembly.validate` so both
 * branches (support present / absent) are covered deterministically, independent of
 * whether the host runtime happens to support SIMD. The un-mocked probe is also
 * asserted to validate on this (SIMD-capable) runtime, guarding against a malformed
 * probe module.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { PRNGType } from '../../src/types/prng';
import {
    isSimdSupported,
    isSimdType,
    defaultPRNGType,
    NON_SIMD_SIBLING
} from '../../src/simd-support';

describe('SIMD support detection', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe('isSimdSupported()', () => {
        it('returns true on this runtime (real probe validates, SIMD-capable CI)', () => {
            // The whole test suite relies on SIMD (the AS pool enables it and the
            // integration suite instantiates SIMD binaries), so real support is a
            // precondition here — a false result would mean the probe bytes broke.
            expect(isSimdSupported()).toBe(true);
        });

        it('returns true when WebAssembly.validate accepts the probe', () => {
            const spy = vi.spyOn(WebAssembly, 'validate').mockReturnValue(true);
            expect(isSimdSupported()).toBe(true);
            expect(spy).toHaveBeenCalledOnce();
        });

        it('returns false when WebAssembly.validate rejects the probe', () => {
            vi.spyOn(WebAssembly, 'validate').mockReturnValue(false);
            expect(isSimdSupported()).toBe(false);
        });

        it('returns false when WebAssembly is unavailable', () => {
            vi.stubGlobal('WebAssembly', undefined);
            expect(isSimdSupported()).toBe(false);
        });

        it('returns false when WebAssembly.validate is not a function', () => {
            vi.stubGlobal('WebAssembly', {});
            expect(isSimdSupported()).toBe(false);
        });
    });

    describe('isSimdType()', () => {
        it('is true for the SIMD algorithms', () => {
            expect(isSimdType(PRNGType.Xoroshiro128Plus_SIMD)).toBe(true);
            expect(isSimdType(PRNGType.Xoshiro256Plus_SIMD)).toBe(true);
        });

        it('is false for the non-SIMD algorithms', () => {
            expect(isSimdType(PRNGType.PCG)).toBe(false);
            expect(isSimdType(PRNGType.Xoroshiro128Plus)).toBe(false);
            expect(isSimdType(PRNGType.Xoshiro256Plus)).toBe(false);
        });
    });

    describe('NON_SIMD_SIBLING', () => {
        it('maps each SIMD algorithm to its non-SIMD sibling', () => {
            expect(NON_SIMD_SIBLING[PRNGType.Xoroshiro128Plus_SIMD]).toBe(PRNGType.Xoroshiro128Plus);
            expect(NON_SIMD_SIBLING[PRNGType.Xoshiro256Plus_SIMD]).toBe(PRNGType.Xoshiro256Plus);
        });

        it('has no entry for non-SIMD algorithms', () => {
            expect(NON_SIMD_SIBLING[PRNGType.PCG]).toBeUndefined();
            expect(NON_SIMD_SIBLING[PRNGType.Xoroshiro128Plus]).toBeUndefined();
        });
    });

    describe('defaultPRNGType()', () => {
        it('selects the SIMD default when SIMD is supported', () => {
            vi.spyOn(WebAssembly, 'validate').mockReturnValue(true);
            expect(defaultPRNGType()).toBe(PRNGType.Xoroshiro128Plus_SIMD);
        });

        it('degrades to the non-SIMD sibling when SIMD is unavailable', () => {
            vi.spyOn(WebAssembly, 'validate').mockReturnValue(false);
            expect(defaultPRNGType()).toBe(PRNGType.Xoroshiro128Plus);
        });
    });
});
