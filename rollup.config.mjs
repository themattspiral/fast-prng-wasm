import { wasm } from '@rollup/plugin-wasm';
import copy from 'rollup-plugin-copy';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
    {
        input: 'src/index.js',
        output: [
            { file: 'dist/index.js', format: 'cjs' },
            { file: 'dist/index.mjs', format: 'es' },
            { file: 'dist/index.umd.js', format: 'umd', name: 'fastPRNGWasm' }
        ],
        plugins: [
            wasm({
                sync: [
                    'bin/pcg.wasm',
                    'bin/xoroshiro128plus.wasm',
                    'bin/xoroshiro128plus-simd.wasm',
                    'bin/xoshiro256plus.wasm',
                    'bin/xoshiro256plus-simd.wasm',
                ],
                targetEnv: 'auto-inline'
            }),
            copy({
                targets: [
                    // make AssemblyScript sources available from the package
                    { src: 'src/assembly/*', dest: 'dist/assembly' },
                ]
            }),
            typescript({
                tsconfig: './tsconfig.json'
            })
        ]
    },

    // emit a single bundled type definition
    {
        input: 'src/index.js',
        output: {
          file: 'dist/index.d.ts',
          format: 'es',
        },
        plugins: [dts()]
    }
];
