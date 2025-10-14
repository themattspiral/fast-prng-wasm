import { rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));

['coverage'].forEach(dir => {
    const dirPath = join(__dirname, '../', dir);
    rmSync(dirPath, { recursive: true, force: true });
});

console.log('Coverage clean - Ready to test.');
