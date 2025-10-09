# fast-prng-wasm

PRNG AssemblyScript API - Can be used within other AssemblyScript projects.

> **⚠️ Thread Safety Warning ⚠️:**
> WASM PRNG implemetations use top-level internal state and functions to
> prevent the accumulation of small overhead that comes with using classes.
> 
> While they are encapsulted within namespaces so as not to interfere with
> your own AssemblyScript project's global namespace, this also means that
> they are NOT THREAD SAFE WITHIN WASM DIRECTLY.
> 
> To acheive thread safety from the JS runtime calling your AssemblyScript 
> WASM project binary, it must be structured in such a way as to create 
> separate WASM instances from JS. This is the approach used by the included
> JavaScript/TypeScript wrapper API.

## Namespaces

| Namespace | Description |
| ------ | ------ |
| [PCG](fast-prng-wasm/namespaces/PCG.md) | An AssemblyScript implementation of the PCG pseudo random number generator, a 32-bit generator with 64 bits of state and unique stream selection. |
| [Xoroshiro128Plus](fast-prng-wasm/namespaces/Xoroshiro128Plus.md) | An AssemblyScript implementation of the Xoroshiro128+ pseudo random number generator, a 64-bit generator with 128 bits of state (2^128 period) and a jump function for unique sequence selection. |
| [Xoroshiro128Plus\_SIMD](fast-prng-wasm/namespaces/Xoroshiro128Plus_SIMD.md) | An AssemblyScript implementation of the Xoroshiro128+ pseudo random number generator, a 64-bit generator with 128 bits of state (2^128 period) and a jump function for unique sequence selection. |
| [Xoshiro256Plus](fast-prng-wasm/namespaces/Xoshiro256Plus.md) | An AssemblyScript implementation of the Xoshiro256+ pseudo random number generator, a 64-bit generator with 256 bits of state (2^256 period) and a jump function for unique sequence selection. |
| [Xoshiro256Plus\_SIMD](fast-prng-wasm/namespaces/Xoshiro256Plus_SIMD.md) | An AssemblyScript implementation of the Xoshiro256+ pseudo random number generator, a 64-bit generator with 256 bits of state (2^256 period) and a jump function for unique sequence selection. |
