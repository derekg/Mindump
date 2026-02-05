// Lexer for ALLM language

import { Token, TokenType, KEYWORDS } from './tokens.js';

export class LexerError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(`Lexer error at ${line}:${column}: ${message}`);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      // Skip whitespace (except newlines)
      case ' ':
      case '\t':
      case '\r':
        break;

      // Newlines are significant for statement termination
      case '\n':
        this.addToken(TokenType.NEWLINE, '\\n');
        this.line++;
        this.column = 1;
        break;

      // Comments
      case '#':
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
        break;

      // Single character tokens
      case '+': this.addToken(TokenType.PLUS, '+'); break;
      case '*': this.addToken(TokenType.STAR, '*'); break;
      case '/': this.addToken(TokenType.SLASH, '/'); break;
      case '%': this.addToken(TokenType.PERCENT, '%'); break;
      case ':': this.addToken(TokenType.COLON, ':'); break;
      case ',': this.addToken(TokenType.COMMA, ','); break;
      case '(': this.addToken(TokenType.LPAREN, '('); break;
      case ')': this.addToken(TokenType.RPAREN, ')'); break;
      case '{': this.addToken(TokenType.LBRACE, '{'); break;
      case '}': this.addToken(TokenType.RBRACE, '}'); break;

      // Two character tokens
      case '-':
        if (this.match('>')) {
          this.addToken(TokenType.ARROW, '->');
        } else {
          this.addToken(TokenType.MINUS, '-');
        }
        break;

      case '.':
        if (this.match('.')) {
          this.addToken(TokenType.DOTDOT, '..');
        } else {
          this.addToken(TokenType.DOT, '.');
        }
        break;

      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQ, '==');
        } else {
          this.addToken(TokenType.ASSIGN, '=');
        }
        break;

      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NE, '!=');
        } else {
          throw new LexerError(`Unexpected character '!'`, this.line, this.column - 1);
        }
        break;

      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LE, '<=');
        } else {
          this.addToken(TokenType.LT, '<');
        }
        break;

      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GE, '>=');
        } else {
          this.addToken(TokenType.GT, '>');
        }
        break;

      // String literals
      case '"':
        this.string();
        break;

      default:
        if (this.isDigit(c)) {
          this.number(c);
        } else if (this.isAlpha(c)) {
          this.identifier(c);
        } else {
          throw new LexerError(`Unexpected character '${c}'`, this.line, this.column - 1);
        }
    }
  }

  private string(): void {
    const startLine = this.line;
    const startColumn = this.column - 1;
    let value = '';

    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\n') {
        throw new LexerError('Unterminated string literal', startLine, startColumn);
      }
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default:
            throw new LexerError(`Invalid escape sequence '\\${escaped}'`, this.line, this.column - 2);
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError('Unterminated string literal', startLine, startColumn);
    }

    this.advance(); // closing "
    this.addToken(TokenType.STRING, value);
  }

  private number(firstChar: string): void {
    let value = firstChar;
    let isFloat = false;

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    if (!this.isAtEnd() && this.peek() === '.' && this.peekNext() !== '.') {
      if (this.isDigit(this.peekNext())) {
        isFloat = true;
        value += this.advance(); // consume '.'
        while (!this.isAtEnd() && this.isDigit(this.peek())) {
          value += this.advance();
        }
      }
    }

    this.addToken(isFloat ? TokenType.FLOAT : TokenType.INTEGER, value);
  }

  private identifier(firstChar: string): void {
    let value = firstChar;

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    const tokenType = KEYWORDS[value] ?? TokenType.IDENT;
    this.addToken(tokenType, value);
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.pos];
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '\0';
    return this.source[this.pos + 1];
  }

  private advance(): string {
    const c = this.source[this.pos];
    this.pos++;
    this.column++;
    return c;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.pos] !== expected) return false;
    this.pos++;
    this.column++;
    return true;
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    });
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}
