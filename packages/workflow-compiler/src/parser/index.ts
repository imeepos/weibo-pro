import { Token, TokenType } from '../lexer'
import type {
  WorkflowDefinition,
  NodeDefinition,
  ConnectionDefinition,
  VariableDeclaration,
  Expression,
  LiteralExpression,
  VariableExpression,
  BinaryExpression,
  ObjectExpression,
  ArrayExpression,
  BinaryOperator,
  PortReference,
  ImportDeclaration,
  UseDeclaration,
} from './ast'

export class ParserError extends Error {
  constructor(
    message: string,
    public token: Token
  ) {
    super(`Parser Error at ${token.line}:${token.column} - ${message}`)
    this.name = 'ParserError'
  }
}

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

export class Parser {
  private pos = 0
  private current: Token

  constructor(private tokens: Token[]) {
    this.current = tokens[0]!
  }

  parse(): WorkflowDefinition {
    const imports = this.parseImports()
    return this.parseWorkflow(imports)
  }

  private parseImports(): ImportDeclaration[] {
    const imports: ImportDeclaration[] = []
    while (this.current.type === TokenType.IMPORT) {
      imports.push(this.parseImport())
    }
    return imports
  }

  private parseImport(): ImportDeclaration {
    const startToken = this.eat(TokenType.IMPORT)
    const pathToken = this.eat(TokenType.STRING)
    let alias: string | undefined

    if (this.current.type === TokenType.AS) {
      this.advance()
      alias = this.eat(TokenType.IDENTIFIER).value as string
    }

    return {
      type: 'ImportDeclaration',
      path: pathToken.value as string,
      alias,
      position: { line: startToken.line, column: startToken.column },
    }
  }

  private advance(): Token {
    const token = this.current
    this.pos++
    this.current = this.tokens[this.pos] ?? { type: TokenType.EOF, value: null, line: 0, column: 0 }
    return token
  }

  private eat(type: TokenType): Token {
    if (this.current.type !== type) {
      throw new ParserError(`Expected ${type}, got ${this.current.type}`, this.current)
    }
    return this.advance()
  }

  private peek(offset = 1): Token {
    return this.tokens[this.pos + offset] ?? { type: TokenType.EOF, value: null, line: 0, column: 0 }
  }

  private parseWorkflow(imports: ImportDeclaration[]): WorkflowDefinition {
    const startToken = this.eat(TokenType.WORKFLOW)
    const nameToken = this.eat(TokenType.STRING)
    this.eat(TokenType.LBRACE)

    const uses: UseDeclaration[] = []
    const variables: VariableDeclaration[] = []
    const nodes: NodeDefinition[] = []
    const connections: ConnectionDefinition[] = []

    while (this.current.type !== TokenType.RBRACE && this.current.type !== TokenType.EOF) {
      if (this.current.type === TokenType.USE) {
        uses.push(this.parseUse())
      } else if (this.current.type === TokenType.VARIABLES) {
        variables.push(...this.parseVariables())
      } else if (this.current.type === TokenType.NODE) {
        nodes.push(this.parseNode())
      } else if (this.current.type === TokenType.IDENTIFIER) {
        connections.push(this.parseConnection())
      } else {
        throw new ParserError(`Unexpected token: ${this.current.type}`, this.current)
      }
    }

    this.eat(TokenType.RBRACE)

    return {
      type: 'Workflow',
      name: nameToken.value as string,
      imports: imports.length > 0 ? imports : undefined,
      uses: uses.length > 0 ? uses : undefined,
      variables: variables.length > 0 ? variables : undefined,
      nodes,
      connections,
      position: { line: startToken.line, column: startToken.column },
    }
  }

  private parseUse(): UseDeclaration {
    const startToken = this.eat(TokenType.USE)
    const moduleAlias = this.eat(TokenType.IDENTIFIER).value as string
    this.eat(TokenType.DOT)
    const nodeName = this.eat(TokenType.IDENTIFIER).value as string
    this.eat(TokenType.AS)
    const localAlias = this.eat(TokenType.IDENTIFIER).value as string

    return {
      type: 'UseDeclaration',
      moduleAlias,
      nodeName,
      localAlias,
      position: { line: startToken.line, column: startToken.column },
    }
  }

  private parseVariables(): VariableDeclaration[] {
    this.eat(TokenType.VARIABLES)
    this.eat(TokenType.LBRACE)

    const variables: VariableDeclaration[] = []

    while (this.current.type !== TokenType.RBRACE) {
      const nameToken = this.eat(TokenType.IDENTIFIER)
      this.eat(TokenType.EQUALS)
      const value = this.parseExpression()

      variables.push({
        type: 'VariableDeclaration',
        name: nameToken.value as string,
        value,
        position: { line: nameToken.line, column: nameToken.column },
      })

      if (this.current.type === TokenType.COMMA) {
        this.advance()
      }
    }

    this.eat(TokenType.RBRACE)
    return variables
  }

  private parseNode(): NodeDefinition {
    const startToken = this.eat(TokenType.NODE)
    const idToken = this.eat(TokenType.IDENTIFIER)
    this.eat(TokenType.LBRACE)

    let nodeType = ''
    let inputs: Record<string, Expression> | undefined
    let nodePosition: { x: number; y: number } | undefined

    while (this.current.type !== TokenType.RBRACE) {
      const propName = this.eat(TokenType.IDENTIFIER).value as string
      this.eat(TokenType.COLON)

      if (propName === 'type') {
        nodeType = this.eat(TokenType.IDENTIFIER).value as string
      } else if (propName === 'inputs') {
        inputs = this.parseObjectProperties()
      } else if (propName === 'position') {
        const posObj = this.parseObjectProperties()
        const xExpr = posObj.x
        const yExpr = posObj.y

        if (!xExpr || xExpr.type !== 'Literal' || typeof xExpr.value !== 'number') {
          throw new ParserError('Position x must be a number literal', this.current)
        }
        if (!yExpr || yExpr.type !== 'Literal' || typeof yExpr.value !== 'number') {
          throw new ParserError('Position y must be a number literal', this.current)
        }

        nodePosition = {
          x: xExpr.value,
          y: yExpr.value,
        }
      }

      if (this.current.type === TokenType.COMMA) {
        this.advance()
      }
    }

    this.eat(TokenType.RBRACE)

    if (!nodeType) {
      throw new ParserError('Node must have a type', startToken)
    }

    return {
      type: 'Node',
      id: idToken.value as string,
      nodeType,
      inputs,
      nodePosition,
      position: { line: startToken.line, column: startToken.column },
    }
  }

  private parseConnection(): ConnectionDefinition {
    const from = this.parsePortReference()
    const startToken = this.eat(TokenType.ARROW)
    const to = this.parsePortReference()

    let condition: Expression | undefined
    if (this.current.type === TokenType.LBRACKET) {
      this.eat(TokenType.LBRACKET)
      this.eat(TokenType.WHEN)
      this.eat(TokenType.COLON)
      condition = this.parseExpression()
      this.eat(TokenType.RBRACKET)
    }

    return {
      type: 'Connection',
      from,
      to,
      condition,
      position: { line: startToken.line, column: startToken.column },
    }
  }

  private parsePortReference(): PortReference {
    const nodeId = this.eat(TokenType.IDENTIFIER).value as string
    this.eat(TokenType.DOT)
    const portName = this.eat(TokenType.IDENTIFIER).value as string
    return { nodeId, portName }
  }

  private parseExpression(minPrecedence = 0): Expression {
    let left = this.parsePrimaryExpression()

    while (true) {
      const operator = OPERATOR_TOKENS[this.current.type]
      if (!operator) break

      const precedence = PRECEDENCE[operator]
      if (precedence === undefined || precedence < minPrecedence) break

      this.advance()
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

  private parsePrimaryExpression(): Expression {
    const token = this.current

    if (token.type === TokenType.STRING || token.type === TokenType.NUMBER ||
        token.type === TokenType.BOOLEAN || token.type === TokenType.NULL) {
      this.advance()
      return {
        type: 'Literal',
        value: token.value,
        position: { line: token.line, column: token.column },
      } as LiteralExpression
    }

    if (token.type === TokenType.DOLLAR) {
      this.advance()
      const nameToken = this.eat(TokenType.IDENTIFIER)
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

  private parseObjectProperties(): Record<string, Expression> {
    this.eat(TokenType.LBRACE)
    const properties: Record<string, Expression> = {}

    while (this.current.type !== TokenType.RBRACE) {
      const key = this.eat(TokenType.IDENTIFIER).value as string
      this.eat(TokenType.COLON)
      properties[key] = this.parseExpression()

      if (this.current.type === TokenType.COMMA) {
        this.advance()
      }
    }

    this.eat(TokenType.RBRACE)
    return properties
  }

  private parseArray(): ArrayExpression {
    const startToken = this.eat(TokenType.LBRACKET)
    const elements: Expression[] = []

    while (this.current.type !== TokenType.RBRACKET) {
      elements.push(this.parseExpression())
      if (this.current.type === TokenType.COMMA) {
        this.advance()
      }
    }

    this.eat(TokenType.RBRACKET)
    return {
      type: 'Array',
      elements,
      position: { line: startToken.line, column: startToken.column },
    }
  }
}

export * from './ast'
