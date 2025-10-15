import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test timeout
    testTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage/js',

      // Include source files for coverage tracking
      include: ['src/**/*.ts'],

      // Exclude type definitions, WASM (tested indirectly), and type files
      exclude: [
        'src/**/*.d.ts',
        'src/assembly/**',  // WASM code tested via wrapper
        'src/types/**',     // Type definitions only
        'node_modules/**',
        'dist/**',
        'test/**'
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

    // Include/exclude patterns for test files
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],

    // Reporter configuration
    reporters: ['verbose']
  }
});
