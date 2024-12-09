import { rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));

['dist', 'bin', 'docs'].forEach(dir => {
    const dirPath = join(__dirname, '../', dir);
    rmSync(dirPath, { recursive: true, force: true });
});

console.log('clean.');
