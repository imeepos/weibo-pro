import { Token, TokenType } from '../lexer'
import { ParserError } from './errors'
import { TokenCursor } from './token-cursor'
import { ExpressionParser } from './expression-parser'
import type {
  WorkflowDefinition,
  NodeDefinition,
  ConnectionDefinition,
  VariableDeclaration,
  ImportDeclaration,
  UseDeclaration,
  PortReference,
  Expression,
} from './ast'

export { ParserError } from './errors'

export class Parser {
  private cursor: TokenCursor
  private expr: ExpressionParser

  constructor(tokens: Token[]) {
    this.cursor = new TokenCursor(tokens)
    this.expr = new ExpressionParser(this.cursor)
  }

  parse(): WorkflowDefinition {
    const imports = this.parseImports()
    return this.parseWorkflow(imports)
  }

  private parseImports(): ImportDeclaration[] {
    const imports: ImportDeclaration[] = []
    while (this.cursor.type === TokenType.IMPORT) {
      imports.push(this.parseImport())
    }
    return imports
  }

  private parseImport(): ImportDeclaration {
    const startToken = this.cursor.eat(TokenType.IMPORT)
    const pathToken = this.cursor.eat(TokenType.STRING)
    let alias: string | undefined

    if (this.cursor.type === TokenType.AS) {
      this.cursor.advance()
      alias = this.cursor.eat(TokenType.IDENTIFIER).value as string
    }

    return {
      type: 'ImportDeclaration',
      path: pathToken.value as string,
      alias,
      position: { line: startToken.line, column: startToken.column },
    }
  }

  private parseWorkflow(imports: ImportDeclaration[]): WorkflowDefinition {
    const startToken = this.cursor.eat(TokenType.WORKFLOW)
    const nameToken = this.cursor.eat(TokenType.STRING)
    this.cursor.eat(TokenType.LBRACE)

    const uses: UseDeclaration[] = []
    const variables: VariableDeclaration[] = []
    const nodes: NodeDefinition[] = []
    const connections: ConnectionDefinition[] = []

    while (this.cursor.type !== TokenType.RBRACE && this.cursor.type !== TokenType.EOF) {
      if (this.cursor.type === TokenType.USE) {
        uses.push(this.parseUse())
      } else if (this.cursor.type === TokenType.VARIABLES) {
        variables.push(...this.parseVariables())
      } else if (this.cursor.type === TokenType.NODE) {
        nodes.push(this.parseNode())
      } else if (this.cursor.type === TokenType.IDENTIFIER) {
        connections.push(this.parseConnection())
      } else {
        throw new ParserError(`Unexpected token: ${this.cursor.type}`, this.cursor.token)
      }
    }

    this.cursor.eat(TokenType.RBRACE)

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
    const startToken = this.cursor.eat(TokenType.USE)
    const moduleAlias = this.cursor.eat(TokenType.IDENTIFIER).value as string
    this.cursor.eat(TokenType.DOT)
    const nodeName = this.cursor.eat(TokenType.IDENTIFIER).value as string
    this.cursor.eat(TokenType.AS)
    const localAlias = this.cursor.eat(TokenType.IDENTIFIER).value as string

    return {
      type: 'UseDeclaration',
      moduleAlias,
      nodeName,
      localAlias,
      position: { line: startToken.line, column: startToken.column },
    }
  }

  private parseVariables(): VariableDeclaration[] {
    this.cursor.eat(TokenType.VARIABLES)
    this.cursor.eat(TokenType.LBRACE)

    const variables: VariableDeclaration[] = []

    while (this.cursor.type !== TokenType.RBRACE) {
      const nameToken = this.cursor.eat(TokenType.IDENTIFIER)
      this.cursor.eat(TokenType.EQUALS)
      const value = this.expr.parseExpression()

      variables.push({
        type: 'VariableDeclaration',
        name: nameToken.value as string,
        value,
        position: { line: nameToken.line, column: nameToken.column },
      })

      if (this.cursor.type === TokenType.COMMA) {
        this.cursor.advance()
      }
    }

    this.cursor.eat(TokenType.RBRACE)
    return variables
  }

  private parseNode(): NodeDefinition {
    const startToken = this.cursor.eat(TokenType.NODE)
    const idToken = this.cursor.eat(TokenType.IDENTIFIER)
    this.cursor.eat(TokenType.LBRACE)

    let nodeType = ''
    let inputs: Record<string, Expression> | undefined
    let nodePosition: { x: number; y: number } | undefined

    while (this.cursor.type !== TokenType.RBRACE) {
      const propName = this.cursor.eat(TokenType.IDENTIFIER).value as string
      this.cursor.eat(TokenType.COLON)

      if (propName === 'type') {
        nodeType = this.cursor.eat(TokenType.IDENTIFIER).value as string
      } else if (propName === 'inputs') {
        inputs = this.expr.parseObjectProperties()
      } else if (propName === 'position') {
        const posObj = this.expr.parseObjectProperties()
        const xExpr = posObj.x
        const yExpr = posObj.y

        if (!xExpr || xExpr.type !== 'Literal' || typeof xExpr.value !== 'number') {
          throw new ParserError('Position x must be a number literal', this.cursor.token)
        }
        if (!yExpr || yExpr.type !== 'Literal' || typeof yExpr.value !== 'number') {
          throw new ParserError('Position y must be a number literal', this.cursor.token)
        }

        nodePosition = {
          x: xExpr.value,
          y: yExpr.value,
        }
      }

      if (this.cursor.type === TokenType.COMMA) {
        this.cursor.advance()
      }
    }

    this.cursor.eat(TokenType.RBRACE)

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
    const startToken = this.cursor.eat(TokenType.ARROW)
    const to = this.parsePortReference()

    let condition: Expression | undefined
    if (this.cursor.type === TokenType.LBRACKET) {
      this.cursor.eat(TokenType.LBRACKET)
      this.cursor.eat(TokenType.WHEN)
      this.cursor.eat(TokenType.COLON)
      condition = this.expr.parseExpression()
      this.cursor.eat(TokenType.RBRACKET)
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
    const nodeId = this.cursor.eat(TokenType.IDENTIFIER).value as string
    this.cursor.eat(TokenType.DOT)
    const portName = this.cursor.eat(TokenType.IDENTIFIER).value as string
    return { nodeId, portName }
  }
}

export * from './ast'
