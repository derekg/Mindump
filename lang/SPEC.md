# ALLM Language Specification

**ALLM** (Agent Language for LLMs) is a programming language designed to be written by AI code agents. It prioritizes explicitness, regularity, and predictability over brevity.

## Design Principles

1. **Explicit over implicit** - No type inference, no implicit conversions
2. **Regular grammar** - Every construct follows the same pattern
3. **One way to do things** - No syntactic sugar or alternative syntaxes
4. **Clear delimiters** - Keyword-based block endings (`end`)
5. **Predictable semantics** - No surprises, no magic

## Lexical Structure

### Keywords
```
fn, let, mut, if, else, while, for, in, return, end, true, false,
i32, i64, f32, f64, bool, void, str, struct, and, or, not
```

### Operators
```
+  -  *  /  %          (arithmetic)
== != < > <= >=        (comparison)
=                      (assignment)
->                     (return type annotation)
:                      (type annotation)
,                      (separator)
.                      (member access)
```

### Literals
- Integers: `42`, `-17`, `0`
- Floats: `3.14`, `-0.5`, `1.0`
- Booleans: `true`, `false`
- Strings: `"hello world"`

### Comments
```allm
# Single line comment
```

## Types

### Primitive Types
- `i32` - 32-bit signed integer
- `i64` - 64-bit signed integer
- `f32` - 32-bit floating point
- `f64` - 64-bit floating point
- `bool` - Boolean (true/false)
- `void` - No value (for functions that don't return)
- `str` - String (pointer to null-terminated bytes)

### Composite Types
```allm
struct Point
    x: f64
    y: f64
end
```

## Syntax

### Variable Declaration
Variables must always have explicit type annotations.

```allm
# Immutable binding
let x: i32 = 42

# Mutable binding
let mut counter: i32 = 0
```

### Functions
Functions always require explicit return type and parameter types.

```allm
fn add(a: i32, b: i32) -> i32
    return a + b
end

fn greet() -> void
    # void functions don't need return
end
```

### Control Flow

#### If/Else
```allm
if x > 0
    return 1
else if x < 0
    return -1
else
    return 0
end
```

#### While Loop
```allm
let mut i: i32 = 0
while i < 10
    i = i + 1
end
```

#### For Loop (range-based)
```allm
for i in 0..10
    # i goes from 0 to 9
end
```

### Expressions

#### Arithmetic
```allm
let sum: i32 = a + b
let diff: i32 = a - b
let prod: i32 = a * b
let quot: i32 = a / b
let rem: i32 = a % b
```

#### Comparison
```allm
let eq: bool = a == b
let ne: bool = a != b
let lt: bool = a < b
let gt: bool = a > b
let le: bool = a <= b
let ge: bool = a >= b
```

#### Logical
```allm
let both: bool = a and b
let either: bool = a or b
let neg: bool = not a
```

### Struct Usage
```allm
struct Point
    x: f64
    y: f64
end

fn make_point(x: f64, y: f64) -> Point
    let p: Point = Point { x: x, y: y }
    return p
end

fn distance(p: Point) -> f64
    return p.x * p.x + p.y * p.y
end
```

## Entry Point

The `main` function is the entry point:

```allm
fn main() -> i32
    return 0
end
```

## Complete Example

```allm
# Compute factorial iteratively
fn factorial(n: i32) -> i32
    let mut result: i32 = 1
    let mut i: i32 = 1
    while i <= n
        result = result * i
        i = i + 1
    end
    return result
end

fn main() -> i32
    let x: i32 = factorial(5)
    return x
end
```

## LLVM IR Compilation

ALLM compiles to LLVM IR, which can then be:
1. Compiled to native code with `llc` and a system linker
2. JIT compiled with LLVM's execution engine
3. Compiled to WebAssembly

## Grammar (EBNF)

```ebnf
program     = { function | struct_def } ;
struct_def  = "struct" IDENT { field } "end" ;
field       = IDENT ":" type ;
function    = "fn" IDENT "(" [ params ] ")" "->" type block "end" ;
params      = param { "," param } ;
param       = IDENT ":" type ;
type        = "i32" | "i64" | "f32" | "f64" | "bool" | "void" | "str" | IDENT ;
block       = { statement } ;
statement   = let_stmt | assign_stmt | if_stmt | while_stmt | for_stmt | return_stmt | expr_stmt ;
let_stmt    = "let" [ "mut" ] IDENT ":" type "=" expr ;
assign_stmt = IDENT "=" expr ;
if_stmt     = "if" expr block { "else" "if" expr block } [ "else" block ] "end" ;
while_stmt  = "while" expr block "end" ;
for_stmt    = "for" IDENT "in" expr ".." expr block "end" ;
return_stmt = "return" [ expr ] ;
expr_stmt   = expr ;
expr        = or_expr ;
or_expr     = and_expr { "or" and_expr } ;
and_expr    = eq_expr { "and" eq_expr } ;
eq_expr     = cmp_expr { ( "==" | "!=" ) cmp_expr } ;
cmp_expr    = add_expr { ( "<" | ">" | "<=" | ">=" ) add_expr } ;
add_expr    = mul_expr { ( "+" | "-" ) mul_expr } ;
mul_expr    = unary_expr { ( "*" | "/" | "%" ) unary_expr } ;
unary_expr  = [ "not" | "-" ] primary ;
primary     = NUMBER | STRING | "true" | "false" | IDENT | call | member | "(" expr ")" | struct_lit ;
call        = IDENT "(" [ args ] ")" ;
args        = expr { "," expr } ;
member      = primary "." IDENT ;
struct_lit  = IDENT "{" [ field_init { "," field_init } ] "}" ;
field_init  = IDENT ":" expr ;
```
