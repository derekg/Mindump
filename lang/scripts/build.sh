#!/bin/bash
# Build the ALLM compiler

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANG_DIR="$(dirname "$SCRIPT_DIR")"

cd "$LANG_DIR"

echo "Installing dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Build complete! Compiler is at dist/cli.js"
echo ""
echo "Usage: node dist/cli.js <input.allm>"
