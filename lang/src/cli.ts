#!/usr/bin/env node

// ALLM Compiler CLI

import * as fs from 'node:fs';
import * as path from 'node:path';
import { compile } from './index.js';

function printUsage(): void {
  console.log(`ALLM Compiler - Agent Language for LLMs

Usage: allmc <input.allm> [options]

Options:
  -o, --output <file>   Output file (default: <input>.ll)
  -h, --help            Show this help message
  -v, --version         Show version

Examples:
  allmc program.allm                    # Compile to program.ll
  allmc program.allm -o output.ll       # Compile to output.ll

After compilation, use LLVM tools to create executable:
  llc output.ll -o output.s             # Generate assembly
  clang output.s -o program             # Link to executable

Or use clang directly:
  clang output.ll -o program            # Compile and link
`);
}

function printVersion(): void {
  console.log('allmc 0.1.0');
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    printVersion();
    process.exit(0);
  }

  let inputFile: string | null = null;
  let outputFile: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      if (i + 1 >= args.length) {
        console.error('Error: -o requires an output file');
        process.exit(1);
      }
      outputFile = args[++i];
    } else if (!arg.startsWith('-')) {
      inputFile = arg;
    } else {
      console.error(`Error: Unknown option '${arg}'`);
      process.exit(1);
    }
  }

  if (!inputFile) {
    console.error('Error: No input file specified');
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file '${inputFile}' not found`);
    process.exit(1);
  }

  if (!outputFile) {
    const basename = path.basename(inputFile, path.extname(inputFile));
    const dirname = path.dirname(inputFile);
    outputFile = path.join(dirname, basename + '.ll');
  }

  const source = fs.readFileSync(inputFile, 'utf-8');
  const result = compile(source);

  if (!result.success) {
    console.error(`Compilation failed: ${result.error}`);
    process.exit(1);
  }

  fs.writeFileSync(outputFile, result.llvmIR!);
  console.log(`Compiled ${inputFile} -> ${outputFile}`);
}

main();
