# ALLM - Agent Language for LLMs

ALLM is a programming language designed specifically for AI code agents to write. It prioritizes explicitness, regularity, and predictability over brevity.

## Design Philosophy

ALLM is optimized for code agents (LLMs) to generate correct code:

1. **Explicit over implicit** - No type inference, no implicit conversions
2. **Regular grammar** - Every construct follows the same pattern
3. **One way to do things** - No syntactic sugar or alternative syntaxes
4. **Clear delimiters** - Keyword-based block endings (`end`)
5. **Predictable semantics** - No surprises, no magic

## Quick Start

```bash
# Build the compiler
cd lang
npm install
npm run build

# Compile an ALLM program
node dist/cli.js examples/factorial.allm

# Use LLVM to create executable
clang examples/factorial.ll -o factorial
./factorial
echo $?  # prints 120
```

## Language Features

### Types
- `i32`, `i64` - Signed integers
- `f32`, `f64` - Floating point
- `bool` - Boolean
- `str` - String
- `void` - No value
- Custom structs

### Variable Declaration
```allm
let x: i32 = 42          # Immutable
let mut counter: i32 = 0  # Mutable
```

### Functions
```allm
fn add(a: i32, b: i32) -> i32
    return a + b
end
```

### Control Flow
```allm
if x > 0
    return 1
else if x < 0
    return -1
else
    return 0
end

while i < 10
    i = i + 1
end

for i in 0..10
    # i goes 0 to 9
end
```

### Structs
```allm
struct Point
    x: i32
    y: i32
end

let p: Point = Point { x: 10, y: 20 }
let sum: i32 = p.x + p.y
```

### External Functions
```allm
extern fn puts(s: str) -> i32

fn main() -> i32
    puts("Hello, World!")
    return 0
end
```

## Examples

See the `examples/` directory:
- `hello.allm` - Hello World with external function
- `factorial.allm` - Iterative factorial
- `fibonacci.allm` - Recursive Fibonacci
- `structs.allm` - Struct usage
- `loops.allm` - For and while loops
- `conditionals.allm` - If/else and boolean logic
- `prime.allm` - Prime number checker
- `gcd.allm` - GCD and LCM algorithms

## Compilation Pipeline

```
ALLM Source → Lexer → Tokens → Parser → AST → CodeGen → LLVM IR
                                                           ↓
                                              llc/clang → Native Binary
```

## Self-Hosting Goal

ALLM is designed with self-hosting in mind. The current TypeScript compiler is the "bootstrap" compiler. The language has sufficient features to eventually write its own compiler in ALLM itself.

## Project Structure

```
lang/
├── src/
│   ├── tokens.ts    # Token types
│   ├── lexer.ts     # Tokenizer
│   ├── ast.ts       # AST node types
│   ├── parser.ts    # Recursive descent parser
│   ├── codegen.ts   # LLVM IR generator
│   ├── index.ts     # Main exports
│   └── cli.ts       # Command-line interface
├── examples/        # Example programs
├── scripts/         # Build and run scripts
├── SPEC.md          # Language specification
└── README.md        # This file
```

## Requirements

- Node.js 20+
- LLVM/Clang (for compiling to native code)

## License

MIT
