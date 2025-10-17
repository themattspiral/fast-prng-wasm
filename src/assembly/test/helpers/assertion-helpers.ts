/**
 * Custom Assertion Helpers for AssemblyScript Tests
 *
 * These helpers integrate with the assemblyscript-unittest-framework to provide
 * better error messages than the framework's built-in matchers allow.
 *
 * Why custom helpers?
 * - Framework doesn't support compound assertions (e.g., range checks)
 * - Boolean assertions like `expect(x >= min && x <= max).equal(true)` hide actual values
 * - Error messages should show what failed, not just "expected true, got false"
 *
 * Implementation:
 * - Uses framework's `collectCheckResult()` API for proper test integration
 * - Supports multiple assertions per test (doesn't throw/abort on failure)
 * - No line number tracking (would require custom instrumentation), but labels compensate
 *
 * Coverage impact: None - coverage tracks WASM execution, not assertion calls
 */

import { assertResult } from 'assemblyscript-unittest-framework/assembly/env';

const EXPECT_MAX_INDEX: u32 = 2147483647; // Sentinel value meaning "no code location"

/**
 * Asserts that a value is within a specified range [min, max] (inclusive).
 *
 * Error messages show:
 * - The actual value
 * - The expected range
 * - Which bound was violated (below minimum / above maximum)
 *
 * @param value The value to check
 * @param min The minimum bound (inclusive)
 * @param max The maximum bound (inclusive)
 * @param message Optional label describing what's being tested
 *
 * @example
 * assertInRange(count, 24000, 26000, "Q1 quartile");
 * // On failure: value: 23500  expect: Q1 quartile: in range [24000, 26000] (below minimum)
 */
export function assertInRange<T extends number>(value: T, min: T, max: T, message: string = ""): void {
  const prefix = message ? `${message}: ` : "";
  const inRange = value >= min && value <= max;

  // Build descriptive expectation message based on which bound(s) failed
  let expectMsg: string;
  if (value < min) {
    expectMsg = `${prefix}in range [${min.toString()}, ${max.toString()}] (below minimum)`;
  } else if (value > max) {
    expectMsg = `${prefix}in range [${min.toString()}, ${max.toString()}] (above maximum)`;
  } else {
    expectMsg = `${prefix}in range [${min.toString()}, ${max.toString()}]`;
  }

  assertResult.collectCheckResult(
    inRange,
    EXPECT_MAX_INDEX,
    value.toString(),
    expectMsg
  );
}

/**
 * Asserts that a value is greater than or equal to a minimum.
 *
 * @param value The value to check
 * @param min The minimum bound (inclusive)
 * @param message Optional label describing what's being tested
 *
 * @example
 * assertGreaterThanOrEqual(count, 0, "Sample count");
 * // On failure: value: -5  expect: Sample count: >= 0
 */
export function assertGreaterThanOrEqual<T extends number>(value: T, min: T, message: string = ""): void {
  const prefix = message ? `${message}: ` : "";

  assertResult.collectCheckResult(
    value >= min,
    EXPECT_MAX_INDEX,
    value.toString(),
    `${prefix}>= ${min.toString()}`
  );
}

/**
 * Asserts that a value is greater than a minimum (exclusive lower bound).
 *
 * @param value The value to check
 * @param min The minimum bound (exclusive)
 * @param message Optional label describing what's being tested
 *
 * @example
 * assertGreaterThan(result, 0.999, "Near-one threshold");
 * // On failure: value: 0.998  expect: Near-one threshold: > 0.999
 */
export function assertGreaterThan<T extends number>(value: T, min: T, message: string = ""): void {
  const prefix = message ? `${message}: ` : "";

  assertResult.collectCheckResult(
    value > min,
    EXPECT_MAX_INDEX,
    value.toString(),
    `${prefix}> ${min.toString()}`
  );
}

/**
 * Asserts that a value is less than a maximum (exclusive upper bound).
 *
 * @param value The value to check
 * @param max The maximum bound (exclusive)
 * @param message Optional label describing what's being tested
 *
 * @example
 * assertLessThan(probability, 1.0, "Probability");
 * // On failure: value: 1.5  expect: Probability: < 1.0
 */
export function assertLessThan<T extends number>(value: T, max: T, message: string = ""): void {
  const prefix = message ? `${message}: ` : "";

  assertResult.collectCheckResult(
    value < max,
    EXPECT_MAX_INDEX,
    value.toString(),
    `${prefix}< ${max.toString()}`
  );
}

/**
 * Asserts that a value is less than or equal to a maximum (inclusive upper bound).
 *
 * @param value The value to check
 * @param max The maximum bound (inclusive)
 * @param message Optional label describing what's being tested
 *
 * @example
 * assertLessThanOrEqual(count, 100, "Maximum count");
 * // On failure: value: 105  expect: Maximum count: <= 100
 */
export function assertLessThanOrEqual<T extends number>(value: T, max: T, message: string = ""): void {
  const prefix = message ? `${message}: ` : "";

  assertResult.collectCheckResult(
    value <= max,
    EXPECT_MAX_INDEX,
    value.toString(),
    `${prefix}<= ${max.toString()}`
  );
}
