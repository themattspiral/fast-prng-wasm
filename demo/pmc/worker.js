import { isMainThread, parentPort, workerData } from 'worker_threads';

import { RandomGenerator } from 'fast-prng-wasm';
import { WorkerBatchMode, WorkerSeedMode } from './enum.js';

const label = `worker-${workerData.workerNumber}-${workerData.prngType}`;

if (!isMainThread) {
    const generator = new RandomGenerator(
        workerData.prngType,
        workerData.seedMode === WorkerSeedMode.ParentSeeded ? workerData.parentSeeds : null,
        workerData.workerNumber, // unique worker number ensures a unique jump count / stream increment
        workerData.arrayFillSize
    );

    const workerBatchUpdateTriggerCount = 1020131 - (workerData.workerNumber * 3);

    let pointsGenerated = 0;
    let pointsInCircle = 0;
    let batchPointsGenerated = 0;

    // GeneratorBatch mode confines all test logic to WASM. This is very fast because
    // it doesn't return large volumes of random numbers back to the JS runtime
    if (workerData.batchMode === WorkerBatchMode.GeneratorBatch) {
        while (pointsGenerated < workerData.pointCount) {
            // Number of points we can test before refilling the array is the same as the
            // worker batch report size, so generally we just use this. On the final run,
            // the batch size may be smaller to complete the total number of remaining points
            const remainingPointsToTest = workerData.pointCount - pointsGenerated;
            const pointTestCount = Math.min(workerBatchUpdateTriggerCount, remainingPointsToTest);

            // generate and test random points
            pointsInCircle += generator.batchTestUnitCirclePoints(pointTestCount);
            pointsGenerated += pointTestCount;

            // report results to the main thread
            parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated: pointTestCount });
        }
    }

    // ArrayFill mode consumes random numbers out of the shared memory buffer and tests them
    // here in the JavaScript runtime. This is a demonstration of the fastest strategy for
    // consuming random numbers from fast-prng-wasm's JavaScript API
    else if (workerData.batchMode === WorkerBatchMode.ArrayFill) {
        // each (x,y) coordinate pair consumes 2 random coordinate numbers from the output array
        const maxPointsPerRandomArray = generator.outputArraySize / 2;
        
        while (pointsGenerated < workerData.pointCount) {
            // Number of points we can test before refilling the array has an upper limit (maxPointsPerRandomArray)
            // which is smaller than the worker batch report size, so we normally use this. On the final run, the
            // batch size may be smaller to complete the total number of remaining points
            const remainingPointsToTest = workerData.pointCount - pointsGenerated;
            const pointTestCount = Math.min(maxPointsPerRandomArray, remainingPointsToTest);

            // generate the next batch of random numbers
            const nums = generator.nextArray_CoordSquared();

            // test if points are within the unit circle of radius 1
            for (let i = 0; i < pointTestCount * 2; i += 2) {
                if (nums[i] + nums[i + 1] <= 1) {
                    pointsInCircle++;
                }
                pointsGenerated++;
                batchPointsGenerated++;
    
                // if we have reached the worker batch report size, report results to the main thread
                if (batchPointsGenerated === workerBatchUpdateTriggerCount || pointsGenerated === workerData.pointCount) {
                    parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated });
                    batchPointsGenerated = 0;
                    break;
                }
            }
        }
    }
    
    // Single mode generates each random point one at a time
    else if (workerData.batchMode === WorkerBatchMode.Single) {
        for (let i = 0; i < workerData.pointCount; i++) {
            const xSquared = generator.nextCoordSquared();
            const ySquared = generator.nextCoordSquared();

            if (xSquared + ySquared <= 1) {
                pointsInCircle++;
            }
            pointsGenerated++;
            batchPointsGenerated++;

            // if we have reached the worker batch report size, report results to the main thread
            if (batchPointsGenerated === workerBatchUpdateTriggerCount) {
                parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated });
                batchPointsGenerated = 0;
            }
        }

        // send a final update, because it may have generated a number of points less than 
        // the worker batch update size on the final loop execution which still need to be reported
        parentPort.postMessage({ pointsGenerated, pointsInCircle, batchPointsGenerated });
    }
};
