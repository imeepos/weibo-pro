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
