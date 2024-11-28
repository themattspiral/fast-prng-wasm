import { isMainThread, parentPort, workerData } from 'worker_threads';

// import { RandomGenerator } from '../../dist/index.mjs';       // quick test local fast-prng-wasm
import { RandomGenerator } from 'fast-prng-wasm';

import { WorkerBatchModeType, WorkerSeedModeType } from './enum.js';

const batchSize = workerData.batchSize || 1020131 - workerData.i;
const label = `worker-${workerData.i}-${workerData.prngType}`;

if (!isMainThread) {
    const generator = new RandomGenerator(
        workerData.prngType,
        workerData.seedMode === WorkerSeedModeType.ParentSeeded ? workerData.parentSeeds : undefined,
        workerData.jumpCount || 0,
        workerData.arrayFillSize
    );

    let pointsGenerated = 0;
    let pointsInCircle = 0;
    let batchPointsGenerated = 0;

    if (workerData.batchMode === WorkerBatchModeType.GeneratorBatch) {
        while (pointsGenerated < workerData.pointCount) {
            const bs = Math.min(batchSize, workerData.pointCount - pointsGenerated);
            pointsInCircle += generator.batchTestUnitCirclePoints(bs);
            pointsGenerated += bs;
            parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated: bs });
        }
    } else if (workerData.batchMode === WorkerBatchModeType.ArrayFill) {
        while (pointsGenerated < workerData.pointCount) {
            // each point we test consums 2 numbers from the output array, 
            // so point batch size can be at most half of the output array size.
            const batchPointCount = Math.min(generator.outputArraySize / 2, workerData.pointCount - pointsGenerated);
            const nums = generator.nextArray_CoordSquared();

            for (let i = 0; i < batchPointCount * 2; i += 2) {
                if (nums[i] + nums[i + 1] <= 1) {
                    pointsInCircle++;
                }
                pointsGenerated++;
                batchPointsGenerated++;
    
                if (batchPointsGenerated === batchSize || pointsGenerated === workerData.pointCount) {
                    parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated });
                    batchPointsGenerated = 0;
                    break;
                }
            }
        }
    } else if (workerData.batchMode === WorkerBatchModeType.Single) {
        for (let i = 0; i < workerData.pointCount; i++) {
            const xSquared = generator.nextCoordSquared();
            const ySquared = generator.nextCoordSquared();

            if (xSquared + ySquared <= 1) {
                pointsInCircle++;
            }
            pointsGenerated++;
            batchPointsGenerated++;

            if (batchPointsGenerated === batchSize) {
                parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated });
                batchPointsGenerated = 0;
            }
        }
        parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated });
    }
};
