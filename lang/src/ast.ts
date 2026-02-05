// Abstract Syntax Tree for ALLM language

export type Type =
  | { kind: 'i32' }
  | { kind: 'i64' }
  | { kind: 'f32' }
  | { kind: 'f64' }
  | { kind: 'bool' }
  | { kind: 'void' }
  | { kind: 'str' }
  | { kind: 'named'; name: string }
  | { kind: 'ptr'; inner: Type };

export interface SourceLocation {
  line: number;
  column: number;
}

// Expressions
export type Expr =
  | IntegerLiteral
  | FloatLiteral
  | StringLiteral
  | BoolLiteral
  | Identifier
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | MemberExpr
  | StructLiteral
  | IndexExpr;

export interface IntegerLiteral {
  kind: 'integer';
  value: bigint;
  loc: SourceLocation;
}

export interface FloatLiteral {
  kind: 'float';
  value: number;
  loc: SourceLocation;
}

export interface StringLiteral {
  kind: 'string';
  value: string;
  loc: SourceLocation;
}

export interface BoolLiteral {
  kind: 'bool';
  value: boolean;
  loc: SourceLocation;
}

export interface Identifier {
  kind: 'identifier';
  name: string;
  loc: SourceLocation;
}

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '%'
  | '==' | '!=' | '<' | '>' | '<=' | '>='
  | 'and' | 'or';

export interface BinaryExpr {
  kind: 'binary';
  op: BinaryOp;
  left: Expr;
  right: Expr;
  loc: SourceLocation;
}

export interface UnaryExpr {
  kind: 'unary';
  op: 'not' | '-';
  operand: Expr;
  loc: SourceLocation;
}

export interface CallExpr {
  kind: 'call';
  callee: string;
  args: Expr[];
  loc: SourceLocation;
}

export interface MemberExpr {
  kind: 'member';
  object: Expr;
  field: string;
  loc: SourceLocation;
}

export interface StructLiteral {
  kind: 'struct_literal';
  name: string;
  fields: { name: string; value: Expr }[];
  loc: SourceLocation;
}

export interface IndexExpr {
  kind: 'index';
  object: Expr;
  index: Expr;
  loc: SourceLocation;
}

// Statements
export type Stmt =
  | LetStmt
  | AssignStmt
  | IfStmt
  | WhileStmt
  | ForStmt
  | ReturnStmt
  | ExprStmt;

export interface LetStmt {
  kind: 'let';
  name: string;
  mutable: boolean;
  type: Type;
  init: Expr;
  loc: SourceLocation;
}

export interface AssignStmt {
  kind: 'assign';
  target: Expr;
  value: Expr;
  loc: SourceLocation;
}

export interface IfStmt {
  kind: 'if';
  condition: Expr;
  thenBlock: Stmt[];
  elseIfs: { condition: Expr; block: Stmt[] }[];
  elseBlock: Stmt[] | null;
  loc: SourceLocation;
}

export interface WhileStmt {
  kind: 'while';
  condition: Expr;
  body: Stmt[];
  loc: SourceLocation;
}

export interface ForStmt {
  kind: 'for';
  variable: string;
  start: Expr;
  end: Expr;
  body: Stmt[];
  loc: SourceLocation;
}

export interface ReturnStmt {
  kind: 'return';
  value: Expr | null;
  loc: SourceLocation;
}

export interface ExprStmt {
  kind: 'expr';
  expr: Expr;
  loc: SourceLocation;
}

// Top-level declarations
export interface Parameter {
  name: string;
  type: Type;
}

export interface FunctionDecl {
  kind: 'function';
  name: string;
  params: Parameter[];
  returnType: Type;
  body: Stmt[];
  external: boolean;
  loc: SourceLocation;
}

export interface StructField {
  name: string;
  type: Type;
}

export interface StructDecl {
  kind: 'struct';
  name: string;
  fields: StructField[];
  loc: SourceLocation;
}

export interface ExternDecl {
  kind: 'extern';
  name: string;
  params: Parameter[];
  returnType: Type;
  loc: SourceLocation;
}

export type Decl = FunctionDecl | StructDecl | ExternDecl;

export interface Program {
  declarations: Decl[];
}

// Helper functions
export function typeToString(type: Type): string {
  switch (type.kind) {
    case 'i32': return 'i32';
    case 'i64': return 'i64';
    case 'f32': return 'f32';
    case 'f64': return 'f64';
    case 'bool': return 'bool';
    case 'void': return 'void';
    case 'str': return 'str';
    case 'named': return type.name;
    case 'ptr': return `*${typeToString(type.inner)}`;
  }
}

export function typesEqual(a: Type, b: Type): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'named' && b.kind === 'named') return a.name === b.name;
  if (a.kind === 'ptr' && b.kind === 'ptr') return typesEqual(a.inner, b.inner);
  return true;
}
