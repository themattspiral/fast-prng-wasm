/** @type {import("assemblyscript-unittest-framework/config.d.ts").Config} */
export default {
  // Include both source files for coverage and test files
  include: [
    "src/assembly/test", 
    "src/assembly/common",
    "src/assembly/prng"
  ],

  // Coverage options
  collectCoverage: false,  // Temporarily disabled

  coverageLimit: {
    statements: 98,
    branches: 100,
    functions: 98,
    lines: 98
  },

  // AssemblyScript compiler flags (enable SIMD support, strip @inline for coverage)
  flags: "--exportStart _start --sourceMap --debug -O0 --enable simd --transform ./util/strip-inline-asc-transform.js",

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
