// Token types for ALLM language

export enum TokenType {
  // Literals
  INTEGER = 'INTEGER',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Identifiers
  IDENT = 'IDENT',

  // Keywords
  FN = 'FN',
  LET = 'LET',
  MUT = 'MUT',
  IF = 'IF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  FOR = 'FOR',
  IN = 'IN',
  RETURN = 'RETURN',
  END = 'END',
  STRUCT = 'STRUCT',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  AS = 'AS',

  // Type keywords
  I8 = 'I8',
  I32 = 'I32',
  I64 = 'I64',
  U8 = 'U8',
  F32 = 'F32',
  F64 = 'F64',
  BOOL = 'BOOL',
  VOID = 'VOID',
  STR = 'STR',
  NULL = 'NULL',

  // Operators
  PLUS = 'PLUS',           // +
  MINUS = 'MINUS',         // -
  STAR = 'STAR',           // *
  SLASH = 'SLASH',         // /
  PERCENT = 'PERCENT',     // %
  EQ = 'EQ',               // ==
  NE = 'NE',               // !=
  LT = 'LT',               // <
  GT = 'GT',               // >
  LE = 'LE',               // <=
  GE = 'GE',               // >=
  ASSIGN = 'ASSIGN',       // =
  ARROW = 'ARROW',         // ->
  DOTDOT = 'DOTDOT',       // ..

  // Punctuation
  COLON = 'COLON',         // :
  COMMA = 'COMMA',         // ,
  DOT = 'DOT',             // .
  LPAREN = 'LPAREN',       // (
  RPAREN = 'RPAREN',       // )
  LBRACE = 'LBRACE',       // {
  RBRACE = 'RBRACE',       // }
  LBRACKET = 'LBRACKET',   // [
  RBRACKET = 'RBRACKET',   // ]
  AMP = 'AMP',             // & (address-of)
  CARET = 'CARET',         // ^ (dereference)

  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export const KEYWORDS: Record<string, TokenType> = {
  'fn': TokenType.FN,
  'let': TokenType.LET,
  'mut': TokenType.MUT,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'while': TokenType.WHILE,
  'for': TokenType.FOR,
  'in': TokenType.IN,
  'return': TokenType.RETURN,
  'end': TokenType.END,
  'struct': TokenType.STRUCT,
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
  'as': TokenType.AS,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'null': TokenType.NULL,
  'i8': TokenType.I8,
  'i32': TokenType.I32,
  'i64': TokenType.I64,
  'u8': TokenType.U8,
  'f32': TokenType.F32,
  'f64': TokenType.F64,
  'bool': TokenType.BOOL,
  'void': TokenType.VOID,
  'str': TokenType.STR,
};
