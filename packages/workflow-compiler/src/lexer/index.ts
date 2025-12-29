export enum TokenType {
  // Keywords
  WORKFLOW = 'WORKFLOW',
  NODE = 'NODE',
  VARIABLES = 'VARIABLES',
  WHEN = 'WHEN',
  IMPORT = 'IMPORT',
  USE = 'USE',
  AS = 'AS',

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',

  // Symbols
  LBRACE = 'LBRACE',       // {
  RBRACE = 'RBRACE',       // }
  LBRACKET = 'LBRACKET',   // [
  RBRACKET = 'RBRACKET',   // ]
  COLON = 'COLON',         // :
  COMMA = 'COMMA',         // ,
  ARROW = 'ARROW',         // ->
  DOT = 'DOT',             // .
  DOLLAR = 'DOLLAR',       // $
  EQUALS = 'EQUALS',       // =

  // Operators
  PLUS = 'PLUS',           // +
  MINUS = 'MINUS',         // -
  MULTIPLY = 'MULTIPLY',   // *
  DIVIDE = 'DIVIDE',       // /
  GT = 'GT',               // >
  LT = 'LT',               // <
  GTE = 'GTE',             // >=
  LTE = 'LTE',             // <=
  EQ = 'EQ',               // ==
  NEQ = 'NEQ',             // !=

  EOF = 'EOF',
}

export interface Token {
  type: TokenType
  value: string | number | boolean | null
  line: number
  column: number
}

export class LexerError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(`Lexer Error at ${line}:${column} - ${message}`)
    this.name = 'LexerError'
  }
}

const KEYWORDS: Record<string, TokenType> = {
  workflow: TokenType.WORKFLOW,
  node: TokenType.NODE,
  variables: TokenType.VARIABLES,
  when: TokenType.WHEN,
  import: TokenType.IMPORT,
  use: TokenType.USE,
  as: TokenType.AS,
  true: TokenType.BOOLEAN,
  false: TokenType.BOOLEAN,
  null: TokenType.NULL,
}

export class Lexer {
  private pos = 0
  private line = 1
  private column = 1
  private char: string | null

  constructor(private input: string) {
    this.char = input[0] ?? null
  }

  tokenize(): Token[] {
    const tokens: Token[] = []
    let token = this.nextToken()
    while (token.type !== TokenType.EOF) {
      tokens.push(token)
      token = this.nextToken()
    }
    tokens.push(token)
    return tokens
  }

  private advance(): void {
    if (this.char === '\n') {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
    this.pos++
    this.char = this.input[this.pos] ?? null
  }

  private peek(offset = 1): string | null {
    return this.input[this.pos + offset] ?? null
  }

  private skipWhitespace(): void {
    while (this.char && /\s/.test(this.char)) {
      this.advance()
    }
  }

  private skipComment(): void {
    const ch = this.char
    if (ch === '/' && this.peek() === '/') {
      while (this.char !== null && this.char !== '\n') {
        this.advance()
      }
    } else if (ch === '/' && this.peek() === '*') {
      this.advance() // skip /
      this.advance() // skip *
      while (this.char !== null && !(this.char === '*' && this.peek() === '/')) {
        this.advance()
      }
      if (this.char !== null) {
        this.advance() // skip *
        this.advance() // skip /
      }
    }
  }

  private readString(): Token {
    const quote = this.char!
    const startLine = this.line
    const startColumn = this.column
    this.advance() // skip opening quote
    let value = ''
    while (this.char !== null && this.char !== quote) {
      if (this.char === '\\') {
        this.advance()
        const escaped: string | null = this.char
        if (escaped === 'n') value += '\n'
        else if (escaped === 't') value += '\t'
        else if (escaped === 'r') value += '\r'
        else if (escaped === '\\') value += '\\'
        else if (escaped === '"') value += '"'
        else if (escaped === "'") value += "'"
        else value += escaped ?? ''
      } else {
        value += this.char
      }
      this.advance()
    }
    if (this.char === null) {
      throw new LexerError('Unterminated string', startLine, startColumn)
    }
    this.advance() // skip closing quote
    return { type: TokenType.STRING, value, line: startLine, column: startColumn }
  }

  private readNumber(): Token {
    const startLine = this.line
    const startColumn = this.column
    let value = ''
    let hasDot = false

    // Handle negative numbers
    if (this.char === '-') {
      value += this.char
      this.advance()
    }

    while (this.char && (/\d/.test(this.char) || this.char === '.')) {
      if (this.char === '.') {
        if (hasDot) {
          throw new LexerError('Invalid number: multiple decimal points', startLine, startColumn)
        }
        hasDot = true
      }
      value += this.char
      this.advance()
    }
    return { type: TokenType.NUMBER, value: parseFloat(value), line: startLine, column: startColumn }
  }

  private readIdentifier(): Token {
    const startLine = this.line
    const startColumn = this.column
    let value = ''
    while (this.char && /[a-zA-Z0-9_]/.test(this.char)) {
      value += this.char
      this.advance()
    }
    const keyword = KEYWORDS[value]
    if (keyword === TokenType.BOOLEAN) {
      return { type: TokenType.BOOLEAN, value: value === 'true', line: startLine, column: startColumn }
    }
    if (keyword === TokenType.NULL) {
      return { type: TokenType.NULL, value: null, line: startLine, column: startColumn }
    }
    if (keyword) {
      return { type: keyword, value, line: startLine, column: startColumn }
    }
    return { type: TokenType.IDENTIFIER, value, line: startLine, column: startColumn }
  }

  nextToken(): Token {
    while (this.char) {
      // Skip whitespace
      if (/\s/.test(this.char)) {
        this.skipWhitespace()
        continue
      }

      // Skip comments
      if (this.char === '/' && (this.peek() === '/' || this.peek() === '*')) {
        this.skipComment()
        continue
      }

      const startLine = this.line
      const startColumn = this.column

      // String
      if (this.char === '"' || this.char === "'") {
        return this.readString()
      }

      // Number (including negative numbers)
      if (/\d/.test(this.char)) {
        return this.readNumber()
      }

      // Negative number: '-' followed by digit
      if (this.char === '-' && this.peek() && /\d/.test(this.peek()!)) {
        return this.readNumber()
      }

      // Identifier or keyword
      if (/[a-zA-Z_]/.test(this.char)) {
        return this.readIdentifier()
      }

      // Two-character operators
      if (this.char === '-' && this.peek() === '>') {
        this.advance()
        this.advance()
        return { type: TokenType.ARROW, value: '->', line: startLine, column: startColumn }
      }
      if (this.char === '>' && this.peek() === '=') {
        this.advance()
        this.advance()
        return { type: TokenType.GTE, value: '>=', line: startLine, column: startColumn }
      }
      if (this.char === '<' && this.peek() === '=') {
        this.advance()
        this.advance()
        return { type: TokenType.LTE, value: '<=', line: startLine, column: startColumn }
      }
      if (this.char === '=' && this.peek() === '=') {
        this.advance()
        this.advance()
        return { type: TokenType.EQ, value: '==', line: startLine, column: startColumn }
      }
      if (this.char === '!' && this.peek() === '=') {
        this.advance()
        this.advance()
        return { type: TokenType.NEQ, value: '!=', line: startLine, column: startColumn }
      }

      // Single-character tokens
      const singleCharTokens: Record<string, TokenType> = {
        '{': TokenType.LBRACE,
        '}': TokenType.RBRACE,
        '[': TokenType.LBRACKET,
        ']': TokenType.RBRACKET,
        ':': TokenType.COLON,
        ',': TokenType.COMMA,
        '.': TokenType.DOT,
        '$': TokenType.DOLLAR,
        '=': TokenType.EQUALS,
        '+': TokenType.PLUS,
        '-': TokenType.MINUS,
        '*': TokenType.MULTIPLY,
        '/': TokenType.DIVIDE,
        '>': TokenType.GT,
        '<': TokenType.LT,
      }

      const tokenType = singleCharTokens[this.char]
      if (tokenType) {
        const char = this.char
        this.advance()
        return { type: tokenType, value: char, line: startLine, column: startColumn }
      }

      throw new LexerError(`Unexpected character: ${this.char}`, startLine, startColumn)
    }

    return { type: TokenType.EOF, value: null, line: this.line, column: this.column }
  }
}
