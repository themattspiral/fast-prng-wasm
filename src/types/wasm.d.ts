/*
 * rolldown-plugin-wasm returns a loader function which
 * takes imports and returns an instance.
 */
declare module '*.wasm?init&sync' {
  const mod: (imports?: WebAssembly.Imports) => import('./prng').PRNGWasmInstance;

  export default mod;
}
