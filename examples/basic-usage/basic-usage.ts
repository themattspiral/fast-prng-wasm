/**
 * basic-usage - Getting Started with fast-prng-wasm
 *
 * This example demonstrates the core features of the fast-prng-wasm library
 * wit way. Each section builds on the previous one
 * to help you understand how to use high-quality PRNGs in your projects.
 *
 * Run: npm start
 */

import { RandomGenerator, PRNGType, seed64Array } from 'fast-prng-wasm';

const section = (title: string) => {
    console.log('\n' + '='.repeat(60));
    console.log(title);
    console.log('='.repeat(60) + '\n');
};


/* ============================================================================
   1. BASIC GENERATION - Getting Started
   ============================================================================ */

section('1. BASIC GENERATION - Getting Started');

// Create a generator with default settings
// (Xoroshiro128Plus_SIMD, automatically seeded)
const gen = new RandomGenerator();

console.log(`Created generator: ${gen.prngType}`);
console.log(`Seed count required: ${gen.seedCount}\n`);

// Generate different types of random values
console.log('Random 64-bit integer (bigint):    ', gen.int64());
console.log('Random 53-bit integer (number):    ', gen.int53());
console.log('Random 32-bit integer (number):    ', gen.int32());
console.log('Random float (number) in [0, 1):   ', gen.float());
console.log('Random coord (number) in [-1, 1):  ', gen.coord());


/* ============================================================================
   2. ARRAY GENERATION - Bulk Operations
   ============================================================================ */

section('2. ARRAY GENERATION - Bulk Operations');

// Generate random numbers in bulk using array methods
// For bulk generation, this is much faster than calling gen.float() in a loop!
//
// For a detailed explanation of why array methods are 3-5× faster, see:
// README.md "Understanding Performance: Why Array Methods Are Faster"

console.log('>> Performance Comparison: Bulk Generation (100 million numbers)\n');

// Method 1: Generate 100 million numbers using array method
const arrayGen = new RandomGenerator();
const arrayStart = performance.now();
let arraySum = 0;

// 100,000 calls × 1000 results per call = 100M numbers
// Note: Array sizes > 1000 provide convenience, but no performance benefit
for (let i = 0; i < 100000; i++) {
    const batch = arrayGen.floatArray(); // Default size is 1000
    // summing the results consumes values without the memory overhead of
    // holding onto every one, and prevents elimination optimizations
    for (let j = 0; j < batch.length; j++) {
        arraySum += batch[j];
    }
}

const arrayEnd = performance.now();

// Method 2: Generate 100 million numbers using individual calls
const loopGen = new RandomGenerator();
const loopStart = performance.now();
let loopSum = 0;

for (let i = 0; i < 100000000; i++) {
    // summing the results consumes values without the memory overhead of
    // holding onto every one, and prevents elimination optimizations
    loopSum += loopGen.float();
}

// Perf Results
const loopTime = performance.now() - loopStart;
console.log(`Loop method (100M calls):     ${loopTime.toFixed(2)}ms`);

const arrayTime = arrayEnd - arrayStart;
console.log(`Array method (100K calls):    ${arrayTime.toFixed(2)}ms`);
console.log(`→ For bulk generation, array method is ~${(loopTime / arrayTime).toFixed(1)}x faster!`);
console.log('→ Speedup increases with scale due to reduced WASM boundary crossing overhead\n');

// IMPORTANT ⚠️: Understanding buffer reuse
console.log('>> *IMPORTANT*: Array buffer reuse behavior\n');

const testGen = new RandomGenerator();
const array1 = testGen.floatArray();
const firstValue = array1[0];
console.log('array1[0]:', firstValue.toFixed(10));

const array2 = testGen.floatArray(); // Refills the SAME buffer
console.log('array2[0]:', array2[0].toFixed(10));
console.log('array1[0]:', array1[0].toFixed(10), '(changed!)');

console.log('\narray1 === array2:', array1 === array2);
console.log('→ The buffer is reused for performance!\n');

// Stream Consistency
console.log('>> Stream Consistency: Arrays and single calls produce the same stream\n');

const streamSeeds = [99999n, 88888n];
const streamGen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, streamSeeds);
const streamGen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, streamSeeds);

const singleValues = [];
for (let i = 0; i < 10; i++) {
    singleValues.push(streamGen1.float());
}

// Get 10 values using floatArray()
const arrayValues = Array.from(streamGen2.floatArray().slice(0, 10));

// Compare
console.log('First 5 from float():     ', singleValues.slice(0, 5).map(n => n.toFixed(8)).join(', '));
console.log('First 5 from floatArray():', arrayValues.slice(0, 5).map(n => n.toFixed(8)).join(', '));

const allMatch = singleValues.every((val, idx) => val === arrayValues[idx]);
console.log(`\nAll 10 values match: ${allMatch}`);
console.log('→ Arrays don\'t skip or alter the random stream!');


/* ============================================================================
   3. SEEDING FOR REPRODUCIBILITY
   ============================================================================ */

section('3. SEEDING FOR REPRODUCIBILITY');

console.log('>> Manual seeding produces identical sequences\n');

// Create two generators with the same seeds
const seeds = [12345n, 67890n];
const seededGen1 = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);
const seededGen2 = new RandomGenerator(PRNGType.Xoroshiro128Plus, seeds);

console.log('Generator 1 (seeded with [12345n, 67890n]):');
for (let i = 0; i < 5; i++) {
    console.log(`  ${seededGen1.float()}`);
}

console.log('\nGenerator 2 (same seeds):');
for (let i = 0; i < 5; i++) {
    console.log(`  ${seededGen2.float()}`);
}

console.log('\n→ Both generators produce identical sequences!');
console.log('→ Useful for reproducible testing and debugging\n');

// You can also generate seeds programmatically
console.log('>> Use seed64Array() to generate quality seeds:');
const autoSeeds = seed64Array(2);
console.log('Generated seeds:', autoSeeds);


/* ============================================================================
   4. COORDINATE GENERATION - Monte Carlo Basics
   ============================================================================ */

section('4. COORDINATE GENERATION - Monte Carlo Basics');

console.log('Estimating π using random coordinates in [-1, 1)\n');

// Generate random (x,y) coordinate pairs and count how many fall inside unit circle
// Points inside circle / total points ≈ π/4, so π ≈ 4 × (inside/total)

// Method 1: Using built-in batch test
// Fastest because there is very little boundary crossing and all calc is in WASM
console.log('Method 1: Built-in batchTestUnitCirclePoints()\n');

const mcGen1 = new RandomGenerator();
const numPoints = 10000000; // 10 million points

const mc1Start = performance.now();
const insideCircle1 = mcGen1.batchTestUnitCirclePoints(numPoints);
const mc1Time = performance.now() - mc1Start;

const piEstimate1 = 4 * insideCircle1 / numPoints;
const error1 = Math.abs(piEstimate1 - Math.PI);

console.log(`Generated ${numPoints.toLocaleString()} points in ${mc1Time.toFixed(2)}ms`);
console.log(`Points inside circle: ${insideCircle1.toLocaleString()}`);
console.log(`Estimated π: ${piEstimate1.toFixed(10)}`);
console.log(`Actual π:    ${Math.PI.toFixed(10)}`);
console.log(`Error:       ${error1.toFixed(10)}`);

// Method 2: Using coordArray() for manual testing (more flexible)
console.log('\nMethod 2: Using coordArray() for manual testing\n');

const mcGen2 = new RandomGenerator();
let insideCircle2 = 0;

const mc2Start = performance.now();

// Generate coordinates in batches and test manually
// NOTE: coordArray() returns individual coordinates, not (x,y) pairs
// So we need 2 coordinates per point = 2M total coordinates for 1M points
const coordsPerBatch = 1000; // Default array size
const coordsNeeded = numPoints * 2; // 2 coordinates per point
const numBatches = coordsNeeded / coordsPerBatch;

for (let batch = 0; batch < numBatches; batch++) {
    const coords = mcGen2.coordArray(); // Get 1000 coords in [-1, 1)

    // Test pairs of coordinates (x, y) for circle inclusion
    for (let i = 0; i < coords.length; i += 2) {
        const x = coords[i];
        const y = coords[i + 1];
        if (x * x + y * y <= 1.0) {
            insideCircle2++;
        }
    }
}

const mc2Time = performance.now() - mc2Start;

const piEstimate2 = 4 * insideCircle2 / numPoints;
const error2 = Math.abs(piEstimate2 - Math.PI);

console.log(`Generated ${numPoints.toLocaleString()} points in ${mc2Time.toFixed(2)}ms`);
console.log(`Points inside circle: ${insideCircle2.toLocaleString()}`);
console.log(`Estimated π: ${piEstimate2.toFixed(10)}`);
console.log(`Error:       ${error2.toFixed(10)}`);



/* ============================================================================
   5. PRACTICAL EXAMPLE - Dice Simulator
   ============================================================================ */

section('5. PRACTICAL EXAMPLE - Dice Simulator');

console.log('>> Rolling a 6-sided die 60,000 times\n');

// This demonstrates mapping random floats to integer ranges
const diceGen = new RandomGenerator();
const rolls = 60000;
const faces = [0, 0, 0, 0, 0, 0]; // Count for faces 1-6

// Roll the dice!
for (let i = 0; i < rolls; i++) {
    // Map [0, 1) to [1, 6]
    // Note: Using Math.floor(float * 6) slightly favors lower values due to
    // floating-point precision, but the bias is negligible for many purposes.
    // For cryptographic or high-precision needs, use a rejection sampling method.
    const face = Math.floor(diceGen.float() * 6) + 1;
    faces[face - 1]++;
}

// Display results as ASCII bar chart
console.log('Distribution of dice rolls:\n');
const maxCount = Math.max(...faces);
const barWidth = 50;

faces.forEach((count, index) => {
    const percentage = (count / rolls * 100).toFixed(2);
    const barLength = Math.round((count / maxCount) * barWidth);
    const bar = '█'.repeat(barLength);

    console.log(`Face ${index + 1}: ${bar} ${count.toLocaleString()} (${percentage}%)`);
});

const expectedPerFace = rolls / 6;
console.log(`\nExpected per face: ${expectedPerFace.toLocaleString()} (~16.67%)`);
console.log('→ Distribution is roughly uniform, as expected!');

console.log('\n>> Mapping random floats to ranges:');
console.log('   Simple (good for many uses, demonstrated here):');
console.log('     [1, 6]:     Math.floor(gen.float() * 6) + 1');
console.log('     [0, 99]:    Math.floor(gen.float() * 100)');
console.log('     [10, 20]:   Math.floor(gen.float() * 11) + 10');
console.log('     [-5, 5]:    Math.floor(gen.float() * 11) - 5');
console.log('\n   Unbiased (for high-precision needs):');
console.log('     Use int53() with modulo + rejection sampling');
console.log('     Example: gen.int53() % 6 (with rejection if >= 6 * floor(2^53/6))');
