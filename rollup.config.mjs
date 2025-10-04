import { wasm } from '@rollup/plugin-wasm';
import copy from 'rollup-plugin-copy';

export default [
    {
        input: 'src/index.js',
        output: [
            { file: 'dist/index.js', format: 'cjs' },
            { file: 'dist/index.mjs', format: 'es' },
            {
                format: 'umd',
                file: 'dist/index.umd.js',
                name: 'fastPRNGWasm'
            }
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
                    { src: 'src/assembly/*', dest: 'dist/assembly' },
                ]
            })
        ]
    }
];
