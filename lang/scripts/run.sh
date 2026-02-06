#!/bin/bash
# Compile and run an ALLM program
# Usage: ./run.sh <program.allm>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <program.allm>"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANG_DIR="$(dirname "$SCRIPT_DIR")"
INPUT_FILE="$1"
BASENAME="${INPUT_FILE%.allm}"

# Check if compiler is built
if [ ! -f "$LANG_DIR/dist/cli.js" ]; then
    echo "Compiler not built. Building..."
    "$SCRIPT_DIR/build.sh"
fi

# Compile ALLM to LLVM IR
echo "Compiling $INPUT_FILE to LLVM IR..."
node "$LANG_DIR/dist/cli.js" "$INPUT_FILE" -o "${BASENAME}.ll"

# Check if clang is available
if ! command -v clang &> /dev/null; then
    echo "LLVM IR written to ${BASENAME}.ll"
    echo "clang not found - install LLVM to compile to native code"
    exit 0
fi

# Compile LLVM IR to executable
echo "Compiling to native code..."
clang "${BASENAME}.ll" -o "${BASENAME}"

# Run the program
echo "Running ${BASENAME}..."
echo "---"
"./${BASENAME}"
EXIT_CODE=$?
echo "---"
echo "Exit code: $EXIT_CODE"
