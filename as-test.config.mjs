/** @type {import("assemblyscript-unittest-framework/config.d.ts").Config} */
export default {
  // Include directories containing source files and test files.
  // Note: The framework automatically excludes *.test.ts files from coverage,
  // but we still need to include src/assembly/test so it can find test files to execute.
  // Non-test files in the test directory (like test-utils.ts) must be explicitly excluded.
  include: [
    "src/assembly/test",
    "src/assembly/common",
    "src/assembly/prng"
  ],

  // Exclude test utilities from coverage (has higher priority than include)
  exclude: ["src/assembly/test/test-utils.ts"],

  // Disable by default, enable via CLI
  collectCoverage: false,

  coverageLimit: {
    statements: 98,
    branches: 100,
    functions: 98,
    lines: 98
  },

  // AssemblyScript compiler flags (enable SIMD support, strip @inline for coverage)
  flags: "--exportStart _start --sourceMap --debug -O0 --enable simd --transform ./util/strip-inline-asc-transform.mjs",

  imports(runtime) {
    return {
      env: {
        log: (msg) => {
          runtime.framework.log(runtime.exports.__getString(msg));
        },
      },
    };
  },

  output: "coverage/as",

  mode: ["html", "json", "table"],

  // Isolated test execution
  isolated: true
};
