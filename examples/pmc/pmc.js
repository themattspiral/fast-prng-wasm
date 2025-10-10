import { availableParallelism } from 'os';
import { Worker } from 'worker_threads';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { BigNumber } from 'bignumber.js';

import { PRNGType, seed64Array } from 'fast-prng-wasm';
import { WorkerBatchMode, WorkerSeedMode } from './enum.js';


/* ******************************************************************************* *
 * Modify these parameters to change characteristics of the Monte Carlo simulation *
 * ******************************************************************************* */

const TOTAL_POINT_COUNT = 2000000000;                   // 1 Billion points
const PRNG = PRNGType.Xoshiro256Plus_SIMD;
const WORKER_BATCH_MODE = WorkerBatchMode.GeneratorBatch;
const WORKER_COUNT = availableParallelism();            // use all CPU cores
const WORKER_SEED_MODE = WorkerSeedMode.ParentSeeded    // share seeds across workers (with unique stream/jump)
const PARENT_SEEDS = seed64Array();
const GENERATOR_ARRAY_OUTPUT_SIZE = 1000;               // only used in ArrayFill mode
const CONSOLE_UPDATE_INTERVAL_MS = 200;
BigNumber.config({ DECIMAL_PLACES: 50 });               // precision used for pi calculations

/* ******************************************************************************* */



/* ******************************************************************************* *
 * *********************************  Internal  ********************************** *
 * ******************************************************************************* */

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = join(__dirname, 'worker.js');
const FOUR_BN = new BigNumber(4);

const WORKERS = new Array(WORKER_COUNT);
const pointsPerWorker = Math.floor(TOTAL_POINT_COUNT / WORKER_COUNT);
const pointsLastWorker = pointsPerWorker + (TOTAL_POINT_COUNT % WORKER_COUNT);

let consoleUpdateIntervalId = null;
let totalPointsInCircle = 0;
let totalPointsGenerated = 0;

// a valid method of computing, but limited by JS 53-bit number
const piSimple = () => 4 * totalPointsInCircle / totalPointsGenerated;

// flexible precision
const piPrecise = () => {
    const inside = new BigNumber(totalPointsInCircle);
    const total = new BigNumber(totalPointsGenerated);
    return inside.times(FOUR_BN).dividedBy(total).toString();
};

// update console as the simulation runs
const logStatus = () => {

    let status =`
pmc - Pi Monte Carlo

PRNG Algorithm: ${PRNG}
Point Count: ${TOTAL_POINT_COUNT}
Batch Mode: ${WORKER_BATCH_MODE}
`;
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

// cleanup, final logging, and exit
const finish = () => {
    clearInterval(consoleUpdateIntervalId);
    console.log('');
    console.log('Final π Estimate:', piPrecise());
    console.timeEnd('elapsed');
    process.exit();
};


/* ******************************************************************************* *
 * *********************************    Main    ********************************** *
 * ******************************************************************************* */

// when parent gets CTRL+C, terminate workers and exit 
process.on('SIGINT', () => {
    WORKERS.forEach(wrk => wrk.worker.terminate());
    finish();
});

console.time('elapsed');

// create workers
for (let workerNumber = 0; workerNumber < WORKER_COUNT; workerNumber++) {
    const points = workerNumber === WORKER_COUNT - 1 ? pointsLastWorker : pointsPerWorker;
    const workerData = {
        workerNumber,
        pointCount: points,
        prngType: PRNG,
        batchMode: WORKER_BATCH_MODE,
        seedMode: WORKER_SEED_MODE,
        arrayFillSize: GENERATOR_ARRAY_OUTPUT_SIZE,
        parentSeeds: PARENT_SEEDS
    };

    const worker = new Worker(WORKER_PATH, { workerData });
    WORKERS[workerNumber] = {
        ...workerData,
        worker,
        pointsGenerated: 0,
        pointsInCircle: 0
    };

    worker.on("message", msg => {
        const deltaInCircle = msg.pointsInCircle - WORKERS[workerNumber].pointsInCircle;
        WORKERS[workerNumber].pointsGenerated = msg.pointsGenerated;
        WORKERS[workerNumber].pointsInCircle = msg.pointsInCircle;
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
