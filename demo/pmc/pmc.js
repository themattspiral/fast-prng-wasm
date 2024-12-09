import { availableParallelism } from 'os';
import { Worker } from 'worker_threads';
import { BigNumber } from 'bignumber.js';
import { PRNGType, seed64Array } from 'fast-prng-wasm';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = join(__dirname, 'worker.js');

import { WorkerBatchModeType, WorkerSeedModeType } from './enum.js';

BigNumber.config({ DECIMAL_PLACES: 50 });
const FOUR_BN = new BigNumber(4);
const CONSOLE_UPDATE_INTERVAL_MS = 200;

/**
 * Modify these parameters to change PRNG characteristics
 */
const WORKER_COUNT = availableParallelism();
const WORKER_BATCH_MODE = WorkerBatchModeType.GeneratorBatch;
const GENERATOR_ARRAY_OUTPUT_SIZE = 1000;                   // only used when in ArrayFill mode
const WORKER_SEED_MODE = WorkerSeedModeType.ParentSeeded    // share same seeds across workers (and jump)
const PRNG = PRNGType.Xoroshiro128Plus_SIMD;
const TOTAL_POINT_COUNT = 1000000000;                       // 1 Billion points

// provide the same set of seeds across worker PRNGs (used with generator jump function)
const PARENT_SEEDS = seed64Array();

const pointsPerWorker = Math.floor(TOTAL_POINT_COUNT / WORKER_COUNT);
const pointsLastWorker = pointsPerWorker + (TOTAL_POINT_COUNT % WORKER_COUNT);
const WORKERS = new Array(WORKER_COUNT);

let consoleUpdateIntervalId = null;
let totalPointsInCircle = 0;
let totalPointsGenerated = 0;

const piSimple = () => 4 * totalPointsInCircle / totalPointsGenerated;

const piPrecise = () => {
    const inside = new BigNumber(totalPointsInCircle);
    const total = new BigNumber(totalPointsGenerated);
    return inside.times(FOUR_BN).dividedBy(total).toString();
};

const logStatus = () => {
    let status = `pmc - Pi Monte Carlo\n\n`
        + `PRNG Algorithm: ${PRNG}\n`
        + `Point Count: ${TOTAL_POINT_COUNT}\n`
        + `Batch Mode: ${WORKER_BATCH_MODE}\n\n`;

    WORKERS.forEach((wrk, idx) => {
        status += `Worker ${idx}: ${wrk.pointsGenerated} / ${wrk.pointCount} | ${wrk.seedMode} ${wrk.jumpCount > 0 ? `(jumps: ${wrk.jumpCount})` : ''}\n`;
    });
    
    status += '\nPoints in Circle:';

    console.log(status, totalPointsInCircle);
    console.log('Points Generated:', totalPointsGenerated);
    console.log('% Completed:', totalPointsGenerated * 100 / TOTAL_POINT_COUNT);
    console.log('\nπ:', piPrecise());
    console.timeLog('elapsed');
};

const finish = () => {
    clearInterval(consoleUpdateIntervalId);
    console.log('');
    console.log('Final π Estimate:', piPrecise());
    console.timeEnd('elapsed');
    process.exit();
};


/******* MAIN *******/
/********************/

// when parent gets CTRL+C, terminate workers and exit 
process.on('SIGINT', () => {
    WORKERS.forEach(wrk => wrk.worker.terminate());
    finish();
});

console.time('elapsed');

// create workers
for (let i = 0; i < WORKER_COUNT; i++) {
    const points = i === WORKER_COUNT - 1 ? pointsLastWorker : pointsPerWorker;
    const workerData = {
        i,
        pointCount: points,
        prngType: PRNG,
        batchMode: WORKER_BATCH_MODE,
        seedMode: WORKER_SEED_MODE,
        arrayFillSize: GENERATOR_ARRAY_OUTPUT_SIZE,
        jumpCount: i + 1,  // unique worker number (i) ensures a unique jump count
        parentSeeds: PARENT_SEEDS
    };

    const worker = new Worker(WORKER_PATH, { workerData });
    WORKERS[i] = {
        ...workerData,
        worker,
        pointsGenerated: 0,
        pointsInCircle: 0
    };

    worker.on("message", msg => {
        const deltaInCircle = msg.pointsInCircle - WORKERS[i].pointsInCircle;
        WORKERS[i].pointsGenerated = msg.pointsGenerated;
        WORKERS[i].pointsInCircle = msg.pointsInCircle;
        totalPointsGenerated += msg.batchPointsGenerated;
        totalPointsInCircle += deltaInCircle;
    });
}

// update console and check for completion
consoleUpdateIntervalId = setInterval(() => {
    console.clear();
    logStatus();

    if (totalPointsGenerated === TOTAL_POINT_COUNT) {
        finish();
    }
}, CONSOLE_UPDATE_INTERVAL_MS);
