/**
 * PRNG JavaScript/TypeScript API - Can be used from most modern environments
 * that support WebAssembly. See project README for compatability details.
 * 
 * This wrapper around the WebAssembly PRNGs simplifies WASM usage and makes 
 * them thread safe from the JS runtime by allowing for separate WASM instances.
 * @packageDocumentation
 */

export { PRNGType } from './types/prng';
export * from './random-generator';
export * from './seeds';
