// ALLM Compiler - Main exports

export { Lexer, LexerError } from './lexer.js';
export { Parser, ParseError } from './parser.js';
export { CodeGenerator, CodeGenError } from './codegen.js';
export { Token, TokenType } from './tokens.js';
export * as AST from './ast.js';

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { CodeGenerator } from './codegen.js';

export interface CompileResult {
  success: boolean;
  llvmIR?: string;
  error?: string;
}

export function compile(source: string): CompileResult {
  try {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const codegen = new CodeGenerator();
    const llvmIR = codegen.generate(ast);

    return { success: true, llvmIR };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: String(error) };
  }
}
