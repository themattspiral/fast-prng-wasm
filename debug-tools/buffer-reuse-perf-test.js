/**
 * Quick performance test: Buffer reuse vs copying overhead
 *
 * This script measures the performance impact of copying arrays
 * to help inform the buffer reuse safety decision.
 */

import { RandomGenerator, PRNGType } from '../dist/index.mjs';

const ITERATIONS = 10000;
const ARRAY_SIZES = [100, 1000, 3000]; // Max ~3000 due to 1-page WASM memory limit

console.log('Buffer Reuse vs Copy Performance Test');
console.log('======================================\n');

for (const size of ARRAY_SIZES) {
    console.log(`\nArray Size: ${size} elements (${size * 8} bytes for Float64Array)`);
    console.log('-'.repeat(60));

    const gen = new RandomGenerator(PRNGType.Xoroshiro128Plus_SIMD, null, null, size);

    // Test 1: Direct buffer reuse (current behavior)
    const start1 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        const arr = gen.floatArray();
        // Simulate immediate consumption (accessing first element)
        const val = arr[0];
    }
    const time1 = performance.now() - start1;

    // Test 2: Copying the buffer
    const start2 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        const arr = new Float64Array(gen.floatArray());
        // Same consumption pattern
        const val = arr[0];
    }
    const time2 = performance.now() - start2;

    // Test 3: Array.from() copy
    const start3 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        const arr = Array.from(gen.floatArray());
        const val = arr[0];
    }
    const time3 = performance.now() - start3;

    // Results
    const opsPerSec1 = (ITERATIONS / time1 * 1000).toFixed(0);
    const opsPerSec2 = (ITERATIONS / time2 * 1000).toFixed(0);
    const opsPerSec3 = (ITERATIONS / time3 * 1000).toFixed(0);

    const overhead2 = ((time2 / time1 - 1) * 100).toFixed(1);
    const overhead3 = ((time3 / time1 - 1) * 100).toFixed(1);

    console.log(`Direct (reuse):        ${time1.toFixed(2)}ms (${opsPerSec1} ops/sec) - baseline`);
    console.log(`new Float64Array():    ${time2.toFixed(2)}ms (${opsPerSec2} ops/sec) - ${overhead2}% slower`);
    console.log(`Array.from():          ${time3.toFixed(2)}ms (${opsPerSec3} ops/sec) - ${overhead3}% slower`);

    // Throughput in MB/s
    const mbPerSec1 = (size * 8 * ITERATIONS / time1 / 1000).toFixed(2);
    const mbPerSec2 = (size * 8 * ITERATIONS / time2 / 1000).toFixed(2);
    const mbPerSec3 = (size * 8 * ITERATIONS / time3 / 1000).toFixed(2);

    console.log(`\nThroughput:`);
    console.log(`Direct:                ${mbPerSec1} MB/s`);
    console.log(`new Float64Array():    ${mbPerSec2} MB/s`);
    console.log(`Array.from():          ${mbPerSec3} MB/s`);
}

console.log('\n\nConclusion:');
console.log('===========');
console.log('The performance overhead of copying shows whether buffer reuse');
console.log('optimization is necessary or if safety is more important.');
