import { defineConfig, defineProject } from 'vitest/config';
import { createAssemblyScriptPool } from 'vitest-pool-assemblyscript/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Reporter configuration
    reporters: ['verbose'],

    // Global test timeout
    testTimeout: 10000,

    // Coverage configuration
    coverage: {
      enabled: true,

      provider: 'custom',
      customProviderModule: 'vitest-pool-assemblyscript/coverage',

      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',

      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/index.ts',
        'src/assembly/**/*.ts',
        'src/**/*.d.ts',
        'src/types/**',
      ],

      assemblyScriptInclude: [
        'src/assembly/**/*.ts',
      ],
      assemblyScriptExclude: [
        'src/assembly/index.ts',
        'src/assembly/test/**/*.ts'
      ],

      // Coverage thresholds - lower than AS since core logic is in WASM
      // Wrapper tests verify glue code with mocked WASM
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      },

      // Clean coverage results before running tests
      clean: true
    },

    projects: [
      defineProject({
        test: {
          name: { label: 'TS suite', color: 'blue' },
          include: ['test/**/*.test.ts'],
          exclude: ['node_modules', 'dist'],
        }
      }),

      defineProject({
        test: {
          name: { label: 'AS Suite', color: 'yellow' },
          include: [ 'src/assembly/test/**/*.test.ts' ],
          pool: createAssemblyScriptPool({
            extraCompilerFlags: ['--enable', 'simd'],
          }),
        }
      })
    ]
  }
});
