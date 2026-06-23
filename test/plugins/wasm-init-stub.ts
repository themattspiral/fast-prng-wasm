import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';

const WASM_INIT = /\.wasm\?init(&sync)?$/;

/**
 * Test-only stub for `*.wasm?init&sync` imports.
 *
 * At build time these binaries are inlined by rolldown-plugin-wasm; under the test
 * runner they're only resolvable when the generated `bin/*.wasm` files exist on
 * disk (Vite's built-in `?init` reads the file). The wrapper unit tests replace
 * them with `vi.mock(...)`, but a mock can only attach once the specifier resolves
 * to a module — so with `bin/` absent (e.g. a fresh CI checkout) the mock no-ops
 * and the imported factory comes back `undefined` (the `SEED_COUNT` crash).
 *
 * This plugin resolves any `*.wasm?init[&sync]` import to a stable virtual module
 * so `vi.mock()` can attach, decoupling the unit suite from the generated binaries.
 * It is scoped to the JS/TS test project only; production builds and the
 * AssemblyScript pool are unaffected.
 */
export function wasmInitStub(): Plugin {
  return {
    name: 'wasm-init-stub',
    enforce: 'pre', // win over Vite's built-in wasm handling, which would read the file
    resolveId(source, importer) {
      if (!WASM_INIT.test(source)) return null;
      const [path, query] = source.split('?');
      // Canonicalize to an absolute id so the `src` import and the `vi.mock()`
      // target resolve to the SAME module id — that's what lets the mock attach —
      // without requiring the file to exist on disk.
      const absolute = importer ? resolve(dirname(importer), path) : path;
      return `${absolute}?${query}`;
    },
    load(id) {
      if (!WASM_INIT.test(id)) return null;
      // The real default export is `(imports) => ({ exports })`. This stub throws
      // if it is ever instantiated: the wrapper tests must `vi.mock()` each binary,
      // so reaching here means a mock is missing rather than a silent empty stub.
      return `export default function () {
  throw new Error(
    '[wasm-init-stub] A "*.wasm?init&sync" import was instantiated without a mock. ' +
    'This is a test-only stub; vi.mock() the binary in your unit test ' +
    '(see test/unit/random-generator-wrapper.test.ts).'
  );
}`;
    },
  };
}
