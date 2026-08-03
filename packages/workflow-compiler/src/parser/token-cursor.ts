import { Token, TokenType } from '../lexer'
import { ParserError } from './errors'

const EOF_TOKEN: Token = { type: TokenType.EOF, value: null, line: 0, column: 0 }

/**
 * 共享的 token 游标，维护解析器当前读取位置
 */
export class TokenCursor {
  private pos = 0
  private current: Token

  constructor(private tokens: Token[]) {
    this.current = tokens[0] ?? EOF_TOKEN
  }

  get token(): Token {
    return this.current
  }

  get type(): TokenType {
    return this.current.type
  }

  advance(): Token {
    const token = this.current
    this.pos++
    this.current = this.tokens[this.pos] ?? EOF_TOKEN
    return token
  }

  eat(type: TokenType): Token {
    if (this.current.type !== type) {
      throw new ParserError(`Expected ${type}, got ${this.current.type}`, this.current)
    }
    return this.advance()
  }

  peek(offset = 1): Token {
    return this.tokens[this.pos + offset] ?? EOF_TOKEN
  }
}
