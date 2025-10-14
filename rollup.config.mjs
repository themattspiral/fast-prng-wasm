import { wasm } from '@rollup/plugin-wasm';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';

export default [
    {
        input: 'src/index.ts',
        output: [
            { file: 'dist/index.js', format: 'cjs' },
            { file: 'dist/index.mjs', format: 'es' },
            { file: 'dist/index.umd.js', format: 'umd', name: 'fastPRNGWasm' }
        ],
        plugins: [
            // cleanup existing dist output
            del({
                targets: 'dist', hook: 'buildStart'
            }),

            // handle typescript compilation
            typescript({
                tsconfig: './tsconfig.json'
            }),

            // handle .wasm module imports
            wasm({
                // loader returns a function that compiles modules synchronously
                sync: [
                    'bin/pcg.wasm',
                    'bin/xoroshiro128plus.wasm',
                    'bin/xoroshiro128plus-simd.wasm',
                    'bin/xoshiro256plus.wasm',
                    'bin/xoshiro256plus-simd.wasm'
                ],

                // always embed as base64 (these will always be small)
                targetEnv: 'auto-inline'
            })
        ]
    },

    // emit a single bundled type definition using typescript's emitted definitions
    {
        input: 'dist/dts/index.d.ts',
        output: {
          file: 'dist/index.d.ts', format: 'es'
        },
        plugins: [
            dts(),
            
            // cleanup the intermediate .d.ts files emitted by typescript 
            del({
                targets: 'dist/dts', hook: 'buildEnd'
            })
        ]
    }
];
