#!/usr/bin/env node

/**
 * Checks if build artifacts exist to skip unnecessary rebuilds during local testing.
 * Exits with code 0 if build exists (skip build), code 1 if build needed.
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Check for WASM binaries in bin/
const wasmFiles = [
    'bin/pcg.wasm',
    'bin/xoroshiro128plus.wasm',
    'bin/xoroshiro128plus-simd.wasm',
    'bin/xoshiro256plus.wasm',
    'bin/xoshiro256plus-simd.wasm'
];

// Check for bundled lib files in dist/
const distFiles = [
    'dist/index.js',
    'dist/index.mjs',
    'dist/index.d.ts'
];

const allFiles = [...wasmFiles, ...distFiles];

// Check if all files exist
const missingFiles = allFiles.filter(file => {
    const fullPath = join(projectRoot, file);
    return !existsSync(fullPath);
});

if (missingFiles.length > 0) {
    console.log('Build artifacts missing or incomplete. Build required.');
    console.log('Missing:', missingFiles.join(', '));
    process.exit(1);
} else {
    console.log('Build artifacts found. Skipping build.');
    process.exit(0);
}
