/**
 * PRNG Algorithm Type
 * @enum
 */
export const PRNGType = {
    /** PCG XSH RR */
    PCG: 'PCG',
    /** Xoroshiro128+ */
    Xoroshiro128Plus: 'Xoroshiro128Plus',
    /** Xoroshiro128+ (SIMD-enabled) */
    Xoroshiro128Plus_SIMD: 'Xoroshiro128Plus_SIMD',
    /** Xoshiro256+ */
    Xoshiro256Plus: 'Xoshiro256Plus',
    /** Xoshiro256+ (SIMD-enabled) */
    Xoshiro256Plus_SIMD: 'Xoshiro256Plus_SIMD'
};
