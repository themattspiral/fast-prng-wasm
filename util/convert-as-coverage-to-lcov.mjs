#!/usr/bin/env node

/**
 * Converts AssemblyScript coverage data to lcov format
 *
 * The assemblyscript-unittest-framework outputs:
 * - .trace files: [[functionIndex, basicBlockIndex], ...] execution traces
 * - .debugInfo.json: mapping of function indices to source locations
 * - coverage.json: summary statistics (not used here)
 *
 * This script combines trace + debugInfo to generate lcov format for Codecov
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Coverage directory
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage', 'as');
const OUTPUT_FILE = path.join(COVERAGE_DIR, 'lcov.info');

/**
 * Recursively find all files matching a pattern
 */
function findFiles(dir, pattern) {
  const results = [];

  function search(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        search(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  search(dir);
  return results;
}

/**
 * Parse trace and debugInfo files to build line hit counts
 */
function buildCoverageMap() {
  // Find all trace and debugInfo files
  const traceFiles = findFiles(COVERAGE_DIR, /\.trace$/);

  console.error(`Found ${traceFiles.length} trace files`);

  // Map to store hit counts: { filePath: { lineNumber: hitCount } }
  const coverageMap = new Map();
  const projectRoot = path.join(__dirname, '..');

  // Process each test file
  for (const traceFile of traceFiles) {
    const baseName = path.basename(traceFile, '.trace');
    const debugInfoFile = path.join(path.dirname(traceFile), `${baseName}.debugInfo.json`);

    if (!fs.existsSync(debugInfoFile)) {
      console.error(`Warning: No debugInfo file for ${traceFile}`);
      continue;
    }

    console.error(`Processing ${baseName}...`);

    // Read debug info
    const debugInfo = JSON.parse(fs.readFileSync(debugInfoFile, 'utf8'));
    const { debugFiles, debugInfos } = debugInfo;

    // Pre-process debug files: normalize paths and filter out non-source files
    const normalizedFiles = debugFiles.map(filePath => {
      if (!filePath || filePath.startsWith('~lib/') || filePath.includes('node_modules')) {
        return null; // Mark as filtered
      }
      return path.resolve(projectRoot, filePath);
    });

    // Build reverse index: functionIndex -> function metadata
    // Use array instead of Map for faster lookup
    const funcsByIndex = [];
    for (const [funcName, funcData] of Object.entries(debugInfos)) {
      funcsByIndex[funcData.index] = funcData;
    }

    // Read trace data
    const traceData = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
    console.error(`  Processing ${traceData.length} trace entries...`);

    // Cache line maps to avoid repeated Map.get() calls
    const lineMapCache = new Map();

    // Process trace entries
    for (let i = 0; i < traceData.length; i++) {
      const [funcIdx, bbIdx] = traceData[i];
      const funcData = funcsByIndex[funcIdx];

      if (!funcData) continue;

      const basicBlock = funcData.lineInfo[bbIdx];
      if (!basicBlock) continue;

      // Each basic block contains [[fileIdx, line, col], ...]
      for (let j = 0; j < basicBlock.length; j++) {
        const [fileIdx, line] = basicBlock[j];
        const normalizedPath = normalizedFiles[fileIdx];

        if (!normalizedPath) continue;

        // Get or create line map for this file
        let lineMap = lineMapCache.get(normalizedPath);
        if (!lineMap) {
          lineMap = coverageMap.get(normalizedPath);
          if (!lineMap) {
            lineMap = new Map();
            coverageMap.set(normalizedPath, lineMap);
          }
          lineMapCache.set(normalizedPath, lineMap);
        }

        // Increment hit count
        lineMap.set(line, (lineMap.get(line) || 0) + 1);
      }
    }
  }

  return coverageMap;
}

/**
 * Generate lcov format output
 *
 * lcov format:
 * TN:test name
 * SF:/path/to/source.ts
 * DA:line,hitCount
 * LF:linesFound
 * LH:linesHit
 * end_of_record
 */
function generateLcov(coverageMap) {
  const parts = [];

  for (const [filePath, lineMap] of coverageMap.entries()) {
    parts.push('TN:\n');
    parts.push('SF:', filePath, '\n');

    // Sort lines numerically
    const lines = Array.from(lineMap.keys()).sort((a, b) => a - b);

    let linesHit = 0;

    for (const line of lines) {
      const hitCount = lineMap.get(line);
      parts.push('DA:', line, ',', hitCount, '\n');

      if (hitCount > 0) {
        linesHit++;
      }
    }

    parts.push('LF:', lines.length, '\n');
    parts.push('LH:', linesHit, '\n');
    parts.push('end_of_record\n');
  }

  return parts.join('');
}

/**
 * Main execution
 */
function main() {
  console.error('Converting AssemblyScript coverage to lcov format...');

  if (!fs.existsSync(COVERAGE_DIR)) {
    console.error(`Error: Coverage directory not found: ${COVERAGE_DIR}`);
    process.exit(1);
  }

  // Build coverage map from trace files
  const coverageMap = buildCoverageMap();

  console.error(`Processed coverage for ${coverageMap.size} source files`);

  if (coverageMap.size === 0) {
    console.error('Warning: No coverage data found');
  }

  // Generate lcov output
  const lcov = generateLcov(coverageMap);

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, lcov, 'utf8');

  console.error(`✓ Wrote lcov output to ${OUTPUT_FILE}`);
}

main();
