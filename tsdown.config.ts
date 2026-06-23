import { defineConfig } from 'tsdown';
import { wasm } from 'rolldown-plugin-wasm';

const MINIFY = false;
const SOUCE_MAP = true;

export default defineConfig([{
  entry: [
    'src/index.ts'
  ],

  plugins: [
    wasm({ targetEnv: 'auto-inline' }),
  ],
  
  format: {
    'es': { },
    'cjs': { },
    'umd': { outputOptions: { name: 'fastPRNGWasm' } },
  },
  
  outDir: './dist',
  target: 'node18',
  platform: 'neutral',
  dts: true,
  clean: true,

  inputOptions: {
    optimization: {
      inlineConst: true,
      pifeForModuleWrappers: true
    }
  },
  
  sourcemap: SOUCE_MAP,
  minify: MINIFY,
  outputOptions: {
    minifyInternalExports: MINIFY,
    minify: MINIFY,
    sourcemap: SOUCE_MAP,
  },
}]);
