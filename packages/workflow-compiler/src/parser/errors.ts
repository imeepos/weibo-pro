import { Token } from '../lexer'

export class ParserError extends Error {
  constructor(
    message: string,
    public token: Token
  ) {
    super(`Parser Error at ${token.line}:${token.column} - ${message}`)
    this.name = 'ParserError'
  }
}
