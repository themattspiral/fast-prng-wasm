# fast-prng-wasm Examples

Runnable examples demonstrating how to use `fast-prng-wasm` across different environments. Each is a self-contained project with its own `package.json` and README.

| Example | What it shows | Environment |
|---------|---------------|-------------|
| [**basic-usage**](basic-usage) | Core API walkthrough — value types, bulk arrays, seeding, buffer reuse, a π estimate, and a dice simulator | Node (TypeScript via `tsx`) |
| [**pmc**](pmc) | Pi Monte Carlo across parallel `worker_threads`, sharing seeds with a unique stream per worker | Node |
| [**browser-umd**](browser-umd) | Loading the UMD build with a plain `<script>` tag; interactive single values, histogram, and a Monte Carlo π scatter plot | Browser |
| [**assemblyscript-consumer**](assemblyscript-consumer) | Importing the AssemblyScript sources and using a PRNG directly in WASM, with no JavaScript wrapper | AssemblyScript → WASM |

## Build prerequisite

Each example depends on the library locally (`"fast-prng-wasm": "file:../.."`). In your own project you would instead `npm install fast-prng-wasm`.

- **basic-usage**, **pmc**, and **browser-umd** consume the compiled library, so build it first from the repo root:
  ```sh
  npm install
  npm run build
  ```
- **assemblyscript-consumer** is the exception: it consumes the checked-in AssemblyScript sources in `assembly/` directly, so it needs **no build of the library** — only compilation of its own AssemblyScript. See its README.

Then follow the individual example's README to run it.
