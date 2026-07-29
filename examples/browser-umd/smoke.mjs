/**
 * CI smoke check for the browser-umd example.
 *
 * The demo page is static, so there is nothing to "run" without a browser. This
 * loads the exact UMD bundle the page <script>-loads (via its CommonJS branch)
 * and asserts the public API is present and functional — catching an API or
 * packaging break without needing a browser.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const umd = require(join(here, '..', '..', 'dist', 'index.umd.js'));

for (const name of ['RandomGenerator', 'PRNGType', 'seed64Array']) {
    if (!(name in umd)) {
        console.error(`Missing UMD export: ${name}`);
        process.exit(1);
    }
}

const gen = new umd.RandomGenerator();
if (typeof gen.float() !== 'number' || typeof gen.int64() !== 'bigint') {
    console.error('UMD API check failed: unexpected return types');
    process.exit(1);
}

console.log(`browser-umd UMD bundle OK; default algorithm: ${gen.prngType}`);
