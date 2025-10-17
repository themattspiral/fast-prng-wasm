#!/usr/bin/env bash
# Cross-platform script to compile and run C reference validation
# Works on Linux, macOS, and Windows (via Git Bash or WSL)

set -e  # Exit on error

# Detect compiler
if command -v gcc &> /dev/null; then
    CC=gcc
elif command -v clang &> /dev/null; then
    CC=clang
elif command -v cc &> /dev/null; then
    CC=cc
else
    echo "Error: No C compiler found (gcc, clang, or cc required)"
    exit 1
fi

# Detect OS for executable extension
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    EXE_EXT=".exe"
else
    EXE_EXT=""
fi

echo "Using compiler: $CC"
echo "Compiling validate-jump.c..."

# Compile
$CC validate-jump.c -o "validate-jump${EXE_EXT}" -O2 -Wall -Wextra

echo "Compilation successful!"
echo ""
echo "Running validation..."
echo "===================="

# Run
"./validate-jump${EXE_EXT}"

EXIT_CODE=$?
echo "===================="

if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ All validations passed!"
else
    echo "✗ Validation failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
