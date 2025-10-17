# Contributing to fast-prng-wasm

Thank you for your interest in contributing to fast-prng-wasm! This document provides guidelines for contributing to the project.


## Table of Contents

1. [Development Setup](#development-setup)
2. [Testing](#testing)
3. [Code Style](#code-style)
4. [Pull Request Process](#pull-request-process)


## Development Setup

```bash
# Clone the repository
git clone https://github.com/themattspiral/fast-prng-wasm.git
cd fast-prng-wasm

# Install dependencies
npm install

# Build the project
npm run build

# Run all tests
npm test
```

---

## Testing

This project implements its core PRNGs using WebAssembly via [AssemblyScript](https://www.assemblyscript.org/). We use a dual-testing approach:

| Tests | Type | Target | Framework |
|-------|------|--------|-------------------|
| **AssemblyScript (AS)** | Unit | Algorithm correctness | [`assemblyscript-unittest-framework`](https://github.com/jayphelps/assemblyscript-unittest-framework) |
| **JavaScript (JS)** | Integration | Wrapper API and comprehensive statistical validation | [`vitest`](https://vitest.dev/) |

### Running Tests

```bash
# Run all tests
npm test

# Run AssemblyScript tests only
npm run test:as

# Run JavaScript/integration tests only
#   `npm run build` first if you have changed any AS source files
#   `npm run lib` first if you have changed only JS source files
npm run test:js

# Run AssemblyScript tests with coverage
npm run test:as:coverage

# Run JavaScript tests with coverage
npm run test:js:coverage
```

Reports will be generated in `coverage/`

---

### Writing AssemblyScript Unit Tests

**Location**: `src/assembly/test/` directory

**Example**:
```typescript
import { describe, test, expect, beforeEach } from 'assemblyscript-unittest-framework/assembly';
import { setSeeds, uint64 } from '../../prng/algorithmname';
import {
  TEST_SEEDS,
  TEST_SEEDS_ALT,
  DETERMINISTIC_SAMPLE_SIZE
} from '../test-utils';

describe('AlgorithmName', () => {
  beforeEach(() => {
    setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);  // Complex seeds, reset before each test
  });

  test('uint64 produces identical sequence with same seeds', () => {
    const seq1: u64[] = [];
    for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
      seq1.push(uint64());
    }

    setSeeds(TEST_SEEDS.DOUBLE_0, TEST_SEEDS.DOUBLE_1);
    let mismatchCount = 0;
    for (let i = 0; i < DETERMINISTIC_SAMPLE_SIZE; i++) {
      if (uint64() != seq1[i]) mismatchCount++;
    }

    expect(mismatchCount).equal(0); // All values should match
  });
});
```

**Key Patterns** (for PRNG tests):

1. **Use test-utils.ts constants**: Import TEST_SEEDS, TEST_SEEDS_ALT, DETERMINISTIC_SAMPLE_SIZE, DISTRIBUTION_SAMPLE_SIZE, and other constants from `../test-utils` instead of using magic numbers
   - **Complex Seeds**: Use `TEST_SEEDS.DOUBLE_0` (64-bit hex like `0x9E3779B97F4A7C15`) instead of simple integers like `12345`
   - **Sample Sizes**: Use `DETERMINISTIC_SAMPLE_SIZE` (10K) and `DISTRIBUTION_SAMPLE_SIZE` (100K) constants
   - **Thresholds**: Use named constants like `QUARTILE_MIN`, `QUARTILE_MAX`, `PI_ESTIMATE_TOLERANCE`
2. **Aggregation**: Count errors in a loop, then assert once (avoids inflated test counts because of the way this framework counts every call to `expect()` as a "test")
3. **Inline Comments**: Add comments after `expect()` calls to explain what's being tested
4. **Template**: See `src/assembly/test/prng/xoroshiro128plus.test.ts` for complete example

**Sample Size Rationale**:
- **10K** (DETERMINISTIC_SAMPLE_SIZE): Used for deterministic tests (uniqueness, sequence matching, range validation). Collision probability from 2^64 space is negligible (~10^-15), making 10K samples statistically robust.
- **100K** (DISTRIBUTION_SAMPLE_SIZE): Used for distribution/Monte Carlo smoke tests. Provides ~±4% quartile tolerance and ~±0.02 π estimation tolerance with >99% confidence. Optimized from 1M for speed (6.8× faster) while maintaining adequate validation.
- **Purpose**: AS tests validate PRNG algorithm correctness at the implementation level. Comprehensive statistical validation happens in JS integration tests (see below).

**Required Test Categories** (for PRNG tests):
- Determinism
- Quality (uniqueness, full range)
- Range Validation (all 5 derived types)
- Array Methods (all 6 methods + 2 edge cases)
- Jump Function / Stream Increment
- Statistical Smoke Tests (distribution quartiles, Monte Carlo π, determinism)

---

### Writing JavaScript Integration Tests

**Location**: `test/integration/` directory

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { RandomGenerator, PRNGType } from 'fast-prng-wasm';
import { INTEGRATION_SAMPLE_SIZE } from '../helpers/test-utils';

describe('Feature Name', () => {
  it('should do something specific', () => {
    const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus);

    for (let i = 0; i < INTEGRATION_SAMPLE_SIZE; i++) {
      const result = gen.float();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    }
  });
});
```

> **⚠️ Imports ⚠️**: Always import from `'fast-prng-wasm'` for integration tests, not from `src/`. This ensures tests run against compiled output.

#### Layered Testing Strategy

We use different sample sizes for different test purposes to optimize speed while maintaining comprehensive coverage:

**Integration Smoke Tests** (`test/integration/single-value-methods.test.ts`, `array-behavior.test.ts`, `parallel-streams.test.ts`):
- **Sample Size**: 1,000 (INTEGRATION_SAMPLE_SIZE)
- **Purpose**: Verify wrapper correctly wires up WASM functions across all 5 PRNGs × 6 methods
- **What it catches**: Integration bugs like "wrong WASM function called", "PRNG stuck at zero", "missing export"
- **What it doesn't test**: PRNG quality (that's handled by statistical validation tests)
- **Why 1K not 10K**: Collision probability already negligible (~10⁻¹¹ for float53, ~10⁻¹⁴ for uint64), 10× faster execution, no redundancy with comprehensive quality tests

**Statistical Validation Tests** (`test/integration/statistical-validation.test.ts`):
- **1M samples** (UNIFORMITY_SAMPLES, PI_ESTIMATION_SAMPLES): Chi-square uniformity and Monte Carlo π estimation. Standard error ~0.003, detects biases >0.3%.
- **100K samples** (INDEPENDENCE_SAMPLES): Serial correlation (updated 2025-01-14). Standard error ~0.003, providing robust testing at 17× the 0.05 threshold.
- **Purpose**: Industry-standard comprehensive quality validation with chi-square, serial correlation, and Monte Carlo tests

**Randomized Chaos Tests** (`test/integration/seed-randomization.test.ts`):
- **Sample Size**: 1,000 samples (CHAOS_SAMPLE_SIZE) × 10 iterations (different seeds every run)
- **Purpose**: Catch edge cases with random seeds that fixed seeds might miss
- **What it validates**: Seed initialization robustness across full seed space

This layered approach provides comprehensive coverage while avoiding redundant testing and optimizing CI speed.

---

## Code Style

### AssemblyScript
- Follow existing patterns in `src/assembly/`
- Use `@inline` decorator to optimize all performance critical functions
- Include TypeDoc comments for public functions
- Use explicit types: `u64`, `u32`, `f64`

### JavaScript/TypeScript
- Follow existing patterns in `src/`
- Use TypeScript for type safety
- Include JSDoc comments for public API

### General Guidelines
- Always prefer clear, descriptive names
- Keep functions focused and single-purpose
- Add comments for complex logic or obtuse, non-standard, or otherwise unclear patterns
- Update tests when adding features or fixing bugs

---

## Pull Request Process

1. **Fork the repository**

2. **Create a new branch** from `main` for your work

2. **Make your changes**:
   - Write tests for new features
   - Ensure all tests pass: `npm test`
   - Verify coverage remains above 90%: `npm run test:coverage`

3. **Update documentation**:
   - Update README.md if adding user-facing features
   - Add JSDoc/TypeDoc comments for new public APIs
   - Run `npm run docs` to update generated documentation

4. **Commit your changes**:
   - We use [Conventional Commits](https://www.conventionalcommits.org/) to automatically determine the next appropriate version and generate release notes. Please follow this specification, particularly for:
     - New Features:
     > `feat(prng): Add Xoroshiro128 PRNG and expose via new enum value`
     - Bug Fixes:
     > `fix(wrapper): Detect and throw on array size errors in RandomGenerator constructor`
     - Breaking Changes:
     > `fix(wrapper)!: remove ability to reset array size via removing outputArraySize setter`
     >
     > `BREAKING CHANGE: outputArraySize no longer allows resetting array size after RandomGenerator creation`
   - Use clear, descriptive commit messages
   - Reference issue numbers if applicable

5. **Submit a Pull Request**:
   - Provide a clear description of the changes
   - Link to any related issues
   - Ensure CI/CD checks pass

6. **Code Review**:
   - Address any feedback from maintainers
   - Keep discussions professional and constructive

---

## Questions?

If you have questions about contributing:
- Open an issue for discussion
- Ask in pull request comments
- Check existing issues for similar questions

Thank you for contributing to fast-prng-wasm! 🎲
