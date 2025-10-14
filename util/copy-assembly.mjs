import { cpSync, mkdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../');

// Filter function: allow directories and .ts files only
function tsFilesOnly(src) {
    try {
        return statSync(src).isDirectory() || src.endsWith('.ts');
    } catch {
        return src.endsWith('.ts');
    }
}

// Create destination directories
const destBase = join(projectRoot, 'dist/assembly');
mkdirSync(destBase, { recursive: true });
mkdirSync(join(destBase, 'prng'), { recursive: true });
mkdirSync(join(destBase, 'common'), { recursive: true });

// Copy AssemblyScript source files
cpSync(
    join(projectRoot, 'src/assembly/index.ts'),
    join(destBase, 'index.ts')
);

cpSync(
    join(projectRoot, 'src/assembly/prng'),
    join(destBase, 'prng'),
    { recursive: true, filter: tsFilesOnly }
);

cpSync(
    join(projectRoot, 'src/assembly/common'),
    join(destBase, 'common'),
    { recursive: true, filter: tsFilesOnly }
);

console.log('AssemblyScript sources copied to dist/assembly/');
