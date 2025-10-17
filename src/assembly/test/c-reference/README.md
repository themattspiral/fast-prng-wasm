# C Reference Validation

This directory contains C implementations from the official PRNG reference sources to validate the correctness of our AssemblyScript implementations.

## Prerequisites

- A C compiler (gcc, clang, or cc)
- bash (available via Git Bash/WSL on Windows)

## Purpose

The jump() functions in xoroshiro128+ and xoshiro256+ use polynomial arithmetic that must match the official implementations exactly. These C programs verify that our jump polynomials and implementation produce identical results to the authoritative reference code.

## Files

- `validate-jump.c` - Validates jump() functions against official reference implementations
- `build-and-run.sh` - Cross-platform script to compile and run the validation

## Usage

### Quick Start

```bash
npm run test:c-ref
```

### Manual Build

```bash
cd src/assembly/test/c-reference
bash build-and-run.sh
```

Or compile directly:

```bash
gcc validate-jump.c -o validate-jump -O2 -Wall -Wextra
./validate-jump
```

## Reference Sources

The C implementations are based on the official reference code from:

- **xoroshiro128+**: https://prng.di.unimi.it/xoroshiro128plus.c
- **xoshiro256+**: https://prng.di.unimi.it/xoshiro256plus.c

These are the authoritative implementations by Sebastiano Vigna and David Blackman.

## Cross-Platform Support

The build script automatically detects:
- Available C compiler (gcc, clang, or cc)
- Operating system (Linux, macOS, Windows via Git Bash/WSL)
- Appropriate executable extension

Works on:
- Linux (native)
- macOS (native)
- Windows (via Git Bash, WSL, or MSYS2)
