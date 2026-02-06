// Parser for ALLM language - Recursive Descent

import { Token, TokenType } from './tokens.js';
import * as AST from './ast.js';

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(`Parse error at ${line}:${column}: ${message}`);
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    // Filter out newlines for simpler parsing, but track line numbers on tokens
    this.tokens = tokens.filter(t => t.type !== TokenType.NEWLINE);
  }

  parse(): AST.Program {
    const declarations: AST.Decl[] = [];

    while (!this.isAtEnd()) {
      declarations.push(this.declaration());
    }

    return { declarations };
  }

  private declaration(): AST.Decl {
    if (this.check(TokenType.FN)) {
      return this.functionDecl();
    }
    if (this.check(TokenType.STRUCT)) {
      return this.structDecl();
    }
    if (this.check(TokenType.IDENT) && this.peek().value === 'extern') {
      return this.externDecl();
    }

    throw this.error(`Expected declaration (fn, struct, or extern)`);
  }

  private externDecl(): AST.ExternDecl {
    const loc = this.loc();
    this.advance(); // extern
    this.expect(TokenType.FN, 'Expected "fn" after "extern"');
    const name = this.expect(TokenType.IDENT, 'Expected function name').value;

    this.expect(TokenType.LPAREN, 'Expected "(" after function name');
    const params = this.parameters();
    this.expect(TokenType.RPAREN, 'Expected ")" after parameters');

    this.expect(TokenType.ARROW, 'Expected "->" after parameters');
    const returnType = this.parseType();

    return { kind: 'extern', name, params, returnType, loc };
  }

  private functionDecl(): AST.FunctionDecl {
    const loc = this.loc();
    this.expect(TokenType.FN, 'Expected "fn"');
    const name = this.expect(TokenType.IDENT, 'Expected function name').value;

    this.expect(TokenType.LPAREN, 'Expected "(" after function name');
    const params = this.parameters();
    this.expect(TokenType.RPAREN, 'Expected ")" after parameters');

    this.expect(TokenType.ARROW, 'Expected "->" after parameters');
    const returnType = this.parseType();

    const body = this.block();
    this.expect(TokenType.END, 'Expected "end" after function body');

    return { kind: 'function', name, params, returnType, body, external: false, loc };
  }

  private parameters(): AST.Parameter[] {
    const params: AST.Parameter[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        const name = this.expect(TokenType.IDENT, 'Expected parameter name').value;
        this.expect(TokenType.COLON, 'Expected ":" after parameter name');
        const type = this.parseType();
        params.push({ name, type });
      } while (this.match(TokenType.COMMA));
    }

    return params;
  }

  private structDecl(): AST.StructDecl {
    const loc = this.loc();
    this.expect(TokenType.STRUCT, 'Expected "struct"');
    const name = this.expect(TokenType.IDENT, 'Expected struct name').value;

    const fields: AST.StructField[] = [];
    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      const fieldName = this.expect(TokenType.IDENT, 'Expected field name').value;
      this.expect(TokenType.COLON, 'Expected ":" after field name');
      const fieldType = this.parseType();
      fields.push({ name: fieldName, type: fieldType });
    }

    this.expect(TokenType.END, 'Expected "end" after struct body');
    return { kind: 'struct', name, fields, loc };
  }

  private parseType(): AST.Type {
    if (this.match(TokenType.I8)) return { kind: 'i8' };
    if (this.match(TokenType.I32)) return { kind: 'i32' };
    if (this.match(TokenType.I64)) return { kind: 'i64' };
    if (this.match(TokenType.U8)) return { kind: 'u8' };
    if (this.match(TokenType.F32)) return { kind: 'f32' };
    if (this.match(TokenType.F64)) return { kind: 'f64' };
    if (this.match(TokenType.BOOL)) return { kind: 'bool' };
    if (this.match(TokenType.VOID)) return { kind: 'void' };
    if (this.match(TokenType.STR)) return { kind: 'str' };

    // Pointer type: *T
    if (this.match(TokenType.STAR)) {
      const inner = this.parseType();
      return { kind: 'ptr', inner };
    }

    // Array type: [N]T or []T
    if (this.match(TokenType.LBRACKET)) {
      let size: number | null = null;
      if (this.check(TokenType.INTEGER)) {
        size = parseInt(this.advance().value, 10);
      }
      this.expect(TokenType.RBRACKET, 'Expected "]" in array type');
      const element = this.parseType();
      return { kind: 'array', element, size };
    }

    if (this.check(TokenType.IDENT)) {
      const name = this.advance().value;
      return { kind: 'named', name };
    }

    throw this.error('Expected type');
  }

  private block(): AST.Stmt[] {
    const statements: AST.Stmt[] = [];

    while (!this.check(TokenType.END) && !this.check(TokenType.ELSE) && !this.isAtEnd()) {
      statements.push(this.statement());
    }

    return statements;
  }

  private statement(): AST.Stmt {
    if (this.check(TokenType.LET)) return this.letStmt();
    if (this.check(TokenType.IF)) return this.ifStmt();
    if (this.check(TokenType.WHILE)) return this.whileStmt();
    if (this.check(TokenType.FOR)) return this.forStmt();
    if (this.check(TokenType.RETURN)) return this.returnStmt();

    // Could be assignment or expression statement
    return this.assignOrExprStmt();
  }

  private letStmt(): AST.LetStmt {
    const loc = this.loc();
    this.expect(TokenType.LET, 'Expected "let"');
    const mutable = this.match(TokenType.MUT);
    const name = this.expect(TokenType.IDENT, 'Expected variable name').value;
    this.expect(TokenType.COLON, 'Expected ":" after variable name');
    const type = this.parseType();
    this.expect(TokenType.ASSIGN, 'Expected "=" after type');
    const init = this.expression();

    return { kind: 'let', name, mutable, type, init, loc };
  }

  private ifStmt(): AST.IfStmt {
    const loc = this.loc();
    this.expect(TokenType.IF, 'Expected "if"');
    const condition = this.expression();
    const thenBlock = this.block();

    const elseIfs: { condition: AST.Expr; block: AST.Stmt[] }[] = [];
    let elseBlock: AST.Stmt[] | null = null;

    while (this.match(TokenType.ELSE)) {
      if (this.match(TokenType.IF)) {
        const elifCondition = this.expression();
        const elifBlock = this.block();
        elseIfs.push({ condition: elifCondition, block: elifBlock });
      } else {
        elseBlock = this.block();
        break;
      }
    }

    this.expect(TokenType.END, 'Expected "end" after if statement');
    return { kind: 'if', condition, thenBlock, elseIfs, elseBlock, loc };
  }

  private whileStmt(): AST.WhileStmt {
    const loc = this.loc();
    this.expect(TokenType.WHILE, 'Expected "while"');
    const condition = this.expression();
    const body = this.block();
    this.expect(TokenType.END, 'Expected "end" after while loop');

    return { kind: 'while', condition, body, loc };
  }

  private forStmt(): AST.ForStmt {
    const loc = this.loc();
    this.expect(TokenType.FOR, 'Expected "for"');
    const variable = this.expect(TokenType.IDENT, 'Expected loop variable').value;
    this.expect(TokenType.IN, 'Expected "in" after loop variable');
    const start = this.expression();
    this.expect(TokenType.DOTDOT, 'Expected ".." in range');
    const end = this.expression();
    const body = this.block();
    this.expect(TokenType.END, 'Expected "end" after for loop');

    return { kind: 'for', variable, start, end, body, loc };
  }

  private returnStmt(): AST.ReturnStmt {
    const loc = this.loc();
    this.expect(TokenType.RETURN, 'Expected "return"');

    let value: AST.Expr | null = null;
    if (!this.check(TokenType.END) && !this.check(TokenType.ELSE) &&
        !this.check(TokenType.LET) && !this.check(TokenType.IF) &&
        !this.check(TokenType.WHILE) && !this.check(TokenType.FOR) &&
        !this.check(TokenType.RETURN) && !this.isAtEnd()) {
      value = this.expression();
    }

    return { kind: 'return', value, loc };
  }

  private assignOrExprStmt(): AST.Stmt {
    const loc = this.loc();
    const expr = this.expression();

    if (this.match(TokenType.ASSIGN)) {
      const value = this.expression();
      return { kind: 'assign', target: expr, value, loc };
    }

    return { kind: 'expr', expr, loc };
  }

  // Expression parsing with precedence climbing
  private expression(): AST.Expr {
    return this.orExpr();
  }

  private orExpr(): AST.Expr {
    let left = this.andExpr();

    while (this.match(TokenType.OR)) {
      const loc = this.loc();
      const right = this.andExpr();
      left = { kind: 'binary', op: 'or', left, right, loc };
    }

    return left;
  }

  private andExpr(): AST.Expr {
    let left = this.equalityExpr();

    while (this.match(TokenType.AND)) {
      const loc = this.loc();
      const right = this.equalityExpr();
      left = { kind: 'binary', op: 'and', left, right, loc };
    }

    return left;
  }

  private equalityExpr(): AST.Expr {
    let left = this.comparisonExpr();

    while (true) {
      const loc = this.loc();
      if (this.match(TokenType.EQ)) {
        const right = this.comparisonExpr();
        left = { kind: 'binary', op: '==', left, right, loc };
      } else if (this.match(TokenType.NE)) {
        const right = this.comparisonExpr();
        left = { kind: 'binary', op: '!=', left, right, loc };
      } else {
        break;
      }
    }

    return left;
  }

  private comparisonExpr(): AST.Expr {
    let left = this.addExpr();

    while (true) {
      const loc = this.loc();
      if (this.match(TokenType.LT)) {
        const right = this.addExpr();
        left = { kind: 'binary', op: '<', left, right, loc };
      } else if (this.match(TokenType.GT)) {
        const right = this.addExpr();
        left = { kind: 'binary', op: '>', left, right, loc };
      } else if (this.match(TokenType.LE)) {
        const right = this.addExpr();
        left = { kind: 'binary', op: '<=', left, right, loc };
      } else if (this.match(TokenType.GE)) {
        const right = this.addExpr();
        left = { kind: 'binary', op: '>=', left, right, loc };
      } else {
        break;
      }
    }

    return left;
  }

  private addExpr(): AST.Expr {
    let left = this.mulExpr();

    while (true) {
      const loc = this.loc();
      if (this.match(TokenType.PLUS)) {
        const right = this.mulExpr();
        left = { kind: 'binary', op: '+', left, right, loc };
      } else if (this.match(TokenType.MINUS)) {
        const right = this.mulExpr();
        left = { kind: 'binary', op: '-', left, right, loc };
      } else {
        break;
      }
    }

    return left;
  }

  private mulExpr(): AST.Expr {
    let left = this.unaryExpr();

    while (true) {
      const loc = this.loc();
      if (this.match(TokenType.STAR)) {
        const right = this.unaryExpr();
        left = { kind: 'binary', op: '*', left, right, loc };
      } else if (this.match(TokenType.SLASH)) {
        const right = this.unaryExpr();
        left = { kind: 'binary', op: '/', left, right, loc };
      } else if (this.match(TokenType.PERCENT)) {
        const right = this.unaryExpr();
        left = { kind: 'binary', op: '%', left, right, loc };
      } else {
        break;
      }
    }

    return left;
  }

  private unaryExpr(): AST.Expr {
    const loc = this.loc();

    if (this.match(TokenType.NOT)) {
      const operand = this.unaryExpr();
      return { kind: 'unary', op: 'not', operand, loc };
    }

    if (this.match(TokenType.MINUS)) {
      const operand = this.unaryExpr();
      return { kind: 'unary', op: '-', operand, loc };
    }

    // Address-of: &expr
    if (this.match(TokenType.AMP)) {
      const operand = this.unaryExpr();
      return { kind: 'address_of', operand, loc };
    }

    // Dereference: ^expr
    if (this.match(TokenType.CARET)) {
      const operand = this.unaryExpr();
      return { kind: 'deref', operand, loc };
    }

    return this.postfixExpr();
  }

  private postfixExpr(): AST.Expr {
    let expr = this.primaryExpr();

    while (true) {
      const loc = this.loc();
      if (this.match(TokenType.DOT)) {
        const field = this.expect(TokenType.IDENT, 'Expected field name after "."').value;
        expr = { kind: 'member', object: expr, field, loc };
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.expression();
        this.expect(TokenType.RBRACKET, 'Expected "]" after index');
        expr = { kind: 'index', object: expr, index, loc };
      } else if (this.match(TokenType.AS)) {
        const targetType = this.parseType();
        expr = { kind: 'cast', expr, targetType, loc };
      } else {
        break;
      }
    }

    return expr;
  }

  private primaryExpr(): AST.Expr {
    const loc = this.loc();

    // Literals
    if (this.check(TokenType.INTEGER)) {
      const value = BigInt(this.advance().value);
      return { kind: 'integer', value, loc };
    }

    if (this.check(TokenType.FLOAT)) {
      const value = parseFloat(this.advance().value);
      return { kind: 'float', value, loc };
    }

    if (this.check(TokenType.STRING)) {
      const value = this.advance().value;
      return { kind: 'string', value, loc };
    }

    if (this.match(TokenType.TRUE)) {
      return { kind: 'bool', value: true, loc };
    }

    if (this.match(TokenType.FALSE)) {
      return { kind: 'bool', value: false, loc };
    }

    if (this.match(TokenType.NULL)) {
      return { kind: 'null', loc };
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.expect(TokenType.RPAREN, 'Expected ")" after expression');
      return expr;
    }

    // Identifier, call, or struct literal
    if (this.check(TokenType.IDENT)) {
      const identToken = this.advance();
      const name = identToken.value;

      // Function call - only if ( is on the same line as the identifier
      if (this.check(TokenType.LPAREN) && this.peek().line === identToken.line) {
        this.advance(); // consume (
        const args: AST.Expr[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, 'Expected ")" after arguments');
        return { kind: 'call', callee: name, args, loc };
      }

      // Struct literal - only if { is on the same line as the identifier
      if (this.check(TokenType.LBRACE) && this.peek().line === identToken.line) {
        this.advance(); // consume {
        const fields: { name: string; value: AST.Expr }[] = [];
        if (!this.check(TokenType.RBRACE)) {
          do {
            const fieldName = this.expect(TokenType.IDENT, 'Expected field name').value;
            this.expect(TokenType.COLON, 'Expected ":" after field name');
            const fieldValue = this.expression();
            fields.push({ name: fieldName, value: fieldValue });
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RBRACE, 'Expected "}" after struct literal');
        return { kind: 'struct_literal', name, fields, loc };
      }

      return { kind: 'identifier', name, loc };
    }

    throw this.error('Expected expression');
  }

  // Helper methods
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(message + `, got ${this.peek().type}`);
  }

  private loc(): AST.SourceLocation {
    const token = this.peek();
    return { line: token.line, column: token.column };
  }

  private error(message: string): ParseError {
    const token = this.peek();
    return new ParseError(message, token.line, token.column);
  }
}
