/**
 * Zero-dependency static file server for the browser-umd example.
 *
 * Rooted at the repository root so the page's `../../dist/index.umd.js` reference
 * resolves. Opening index.html directly over file:// also works (the WASM is
 * inlined into the UMD bundle) — this server is just a convenience for those who
 * prefer http://localhost.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(exampleDir, '..', '..');
const START_PATH = '/examples/browser-umd/index.html';
const PORT = Number(process.env.PORT) || 8080;

const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8'
};

const server = createServer(async (req, res) => {
    // Strip the query string, then normalize to keep the resolved path inside the root.
    const requested = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = normalize(requested === '/' ? START_PATH : requested).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(repoRoot, relative);

    try {
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 Not Found: ${relative}\n\nIf this is dist/index.umd.js, build the library first: npm run build (from the repo root)\n`);
    }
});

server.listen(PORT, () => {
    console.log(`Serving browser-umd demo at  http://localhost:${PORT}${START_PATH}`);
    console.log('Press Ctrl+C to stop.');
});
