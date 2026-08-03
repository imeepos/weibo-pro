import { TokenType } from '../lexer'
import { TokenCursor } from './token-cursor'
import { ParserError } from './errors'
import type {
  Expression,
  LiteralExpression,
  VariableExpression,
  BinaryExpression,
  ObjectExpression,
  ArrayExpression,
  BinaryOperator,
} from './ast'

const PRECEDENCE: Record<string, number> = {
  '==': 1,
  '!=': 1,
  '<': 2,
  '>': 2,
  '<=': 2,
  '>=': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
}

const OPERATOR_TOKENS: Record<TokenType, BinaryOperator> = {
  [TokenType.PLUS]: '+',
  [TokenType.MINUS]: '-',
  [TokenType.MULTIPLY]: '*',
  [TokenType.DIVIDE]: '/',
  [TokenType.GT]: '>',
  [TokenType.LT]: '<',
  [TokenType.GTE]: '>=',
  [TokenType.LTE]: '<=',
  [TokenType.EQ]: '==',
  [TokenType.NEQ]: '!=',
} as Record<TokenType, BinaryOperator>

/**
 * 表达式解析器，处理字面量、变量、对象、数组和二元运算
 */
export class ExpressionParser {
  constructor(private cursor: TokenCursor) {}

  parseExpression(minPrecedence = 0): Expression {
    let left = this.parsePrimaryExpression()

    while (true) {
      const operator = OPERATOR_TOKENS[this.cursor.type]
      if (!operator) break

      const precedence = PRECEDENCE[operator]
      if (precedence === undefined || precedence < minPrecedence) break

      this.cursor.advance()
      const right = this.parseExpression(precedence + 1)

      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        position: left.position,
      } as BinaryExpression
    }

    return left
  }

  parseObjectProperties(): Record<string, Expression> {
    this.cursor.eat(TokenType.LBRACE)
    const properties: Record<string, Expression> = {}

    while (this.cursor.type !== TokenType.RBRACE) {
      const key = this.cursor.eat(TokenType.IDENTIFIER).value as string
      this.cursor.eat(TokenType.COLON)
      properties[key] = this.parseExpression()

      if (this.cursor.type === TokenType.COMMA) {
        this.cursor.advance()
      }
    }

    this.cursor.eat(TokenType.RBRACE)
    return properties
  }

  private parsePrimaryExpression(): Expression {
    const token = this.cursor.token

    if (token.type === TokenType.STRING || token.type === TokenType.NUMBER ||
        token.type === TokenType.BOOLEAN || token.type === TokenType.NULL) {
      this.cursor.advance()
      return {
        type: 'Literal',
        value: token.value,
        position: { line: token.line, column: token.column },
      } as LiteralExpression
    }

    if (token.type === TokenType.DOLLAR) {
      this.cursor.advance()
      const nameToken = this.cursor.eat(TokenType.IDENTIFIER)
      return {
        type: 'Variable',
        name: nameToken.value as string,
        position: { line: token.line, column: token.column },
      } as VariableExpression
    }

    if (token.type === TokenType.LBRACE) {
      return {
        type: 'Object',
        properties: this.parseObjectProperties(),
        position: { line: token.line, column: token.column },
      } as ObjectExpression
    }

    if (token.type === TokenType.LBRACKET) {
      return this.parseArray()
    }

    throw new ParserError(`Unexpected token in expression: ${token.type}`, token)
  }

  private parseArray(): ArrayExpression {
    const startToken = this.cursor.eat(TokenType.LBRACKET)
    const elements: Expression[] = []

    while (this.cursor.type !== TokenType.RBRACKET) {
      elements.push(this.parseExpression())
      if (this.cursor.type === TokenType.COMMA) {
        this.cursor.advance()
      }
    }

    this.cursor.eat(TokenType.RBRACKET)
    return {
      type: 'Array',
      elements,
      position: { line: startToken.line, column: startToken.column },
    }
  }
}
