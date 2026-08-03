import { describe, it, expect } from 'vitest'
import { Lexer } from '../lexer'
import { Parser, ParserError } from './index'

describe('Parser', () => {
  const parse = (code: string) => {
    const lexer = new Lexer(code)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens)
    return parser.parse()
  }

  describe('workflow definition', () => {
    it('should parse empty workflow', () => {
      const ast = parse('workflow "test" {}')

      expect(ast.type).toBe('Workflow')
      expect(ast.name).toBe('test')
      expect(ast.nodes).toHaveLength(0)
      expect(ast.connections).toHaveLength(0)
    })

    it('should parse workflow with name', () => {
      const ast = parse('workflow "Weibo Analysis" {}')

      expect(ast.name).toBe('Weibo Analysis')
    })
  })

  describe('node definition', () => {
    it('should parse simple node', () => {
      const ast = parse(`
        workflow "test" {
          node login {
            type: WeiboLoginAst
          }
        }
      `)

      expect(ast.nodes).toHaveLength(1)
      expect(ast.nodes[0]!.id).toBe('login')
      expect(ast.nodes[0]!.nodeType).toBe('WeiboLoginAst')
    })

    it('should parse node with inputs', () => {
      const ast = parse(`
        workflow "test" {
          node search {
            type: WeiboKeywordSearchAst
            inputs: {
              keyword: "AI"
              maxDelay: 3000
            }
          }
        }
      `)

      expect(ast.nodes[0]!.inputs).toBeDefined()
      expect(ast.nodes[0]!.inputs!.keyword).toMatchObject({ type: 'Literal', value: 'AI' })
      expect(ast.nodes[0]!.inputs!.maxDelay).toMatchObject({ type: 'Literal', value: 3000 })
    })

    it('should parse node with position', () => {
      const ast = parse(`
        workflow "test" {
          node login {
            type: WeiboLoginAst
            position: { x: 100, y: 200 }
          }
        }
      `)

      expect(ast.nodes[0]!.nodePosition).toEqual({ x: 100, y: 200 })
    })
  })

  describe('connections', () => {
    it('should parse simple connection', () => {
      const ast = parse(`
        workflow "test" {
          node login { type: WeiboLoginAst }
          node search { type: WeiboKeywordSearchAst }
          login.account -> search.account
        }
      `)

      expect(ast.connections).toHaveLength(1)
      expect(ast.connections[0]!.from).toEqual({ nodeId: 'login', portName: 'account' })
      expect(ast.connections[0]!.to).toEqual({ nodeId: 'search', portName: 'account' })
    })

    it('should parse connection with condition', () => {
      const ast = parse(`
        workflow "test" {
          node analyzer { type: SentimentAnalyzerAst }
          node handler { type: PositiveHandlerAst }
          analyzer.sentiment -> handler.input [when: $value > 0.7]
        }
      `)

      expect(ast.connections[0]!.condition).toBeDefined()
      expect(ast.connections[0]!.condition!.type).toBe('BinaryExpression')
    })
  })

  describe('variables', () => {
    it('should parse variables block', () => {
      const ast = parse(`
        workflow "test" {
          variables {
            keyword = "AI"
            maxResults = 100
          }
          node search { type: WeiboKeywordSearchAst }
        }
      `)

      expect(ast.variables).toHaveLength(2)
      expect(ast.variables![0]!.name).toBe('keyword')
      expect(ast.variables![0]!.value).toMatchObject({ type: 'Literal', value: 'AI' })
      expect(ast.variables![1]!.name).toBe('maxResults')
      expect(ast.variables![1]!.value).toMatchObject({ type: 'Literal', value: 100 })
    })
  })

  describe('expressions', () => {
    it('should parse binary expressions', () => {
      const ast = parse(`
        workflow "test" {
          node analyzer { type: SentimentAnalyzerAst }
          node handler { type: PositiveHandlerAst }
          analyzer.output -> handler.input [when: $value >= 0.5]
        }
      `)

      const condition = ast.connections[0]!.condition!
      expect(condition.type).toBe('BinaryExpression')
      expect((condition as any).operator).toBe('>=')
      expect((condition as any).left.type).toBe('Variable')
      expect((condition as any).right.type).toBe('Literal')
    })

    it('should respect operator precedence', () => {
      const ast = parse(`
        workflow "test" {
          variables {
            result = 1 + 2 * 3
          }
          node n { type: TestAst }
        }
      `)

      // 1 + (2 * 3) due to precedence
      const expr = ast.variables![0]!.value as any
      expect(expr.type).toBe('BinaryExpression')
      expect(expr.operator).toBe('+')
      expect(expr.left.value).toBe(1)
      expect(expr.right.type).toBe('BinaryExpression')
      expect(expr.right.operator).toBe('*')
    })

    it('should parse array expressions', () => {
      const ast = parse(`
        workflow "test" {
          node search {
            type: WeiboKeywordSearchAst
            inputs: {
              keywords: [1, 2, 3]
            }
          }
        }
      `)

      const keywords = ast.nodes[0]!.inputs!.keywords!
      expect(keywords.type).toBe('Array')
      expect((keywords as any).elements).toHaveLength(3)
    })
  })

  describe('error handling', () => {
    it('should throw on missing workflow name', () => {
      expect(() => parse('workflow {}')).toThrow(ParserError)
    })

    it('should throw on missing node type', () => {
      expect(() => parse('workflow "test" { node login {} }')).toThrow(ParserError)
      expect(() => parse('workflow "test" { node login {} }')).toThrow('Node must have a type')
    })

    it('should throw on unexpected token', () => {
      expect(() => parse('workflow "test" { @ }')).toThrow()
    })
  })

  describe('position tracking', () => {
    it('should track source positions', () => {
      const ast = parse('workflow "test" {}')

      expect(ast.position).toBeDefined()
      expect(ast.position!.line).toBe(1)
      expect(ast.position!.column).toBe(1)
    })
  })

  describe('comma handling', () => {
    it('should parse variables with commas', () => {
      const ast = parse(`
        workflow "test" {
          variables {
            a = 1,
            b = 2,
            c = 3
          }
        }
      `)

      expect(ast.variables).toHaveLength(3)
      expect(ast.variables![0]!.name).toBe('a')
      expect(ast.variables![1]!.name).toBe('b')
      expect(ast.variables![2]!.name).toBe('c')
    })

    it('should parse node properties with commas', () => {
      const ast = parse(`
        workflow "test" {
          node test {
            type: TestNode,
            position: { x: 100, y: 200 }
          }
        }
      `)

      expect(ast.nodes[0]!.nodeType).toBe('TestNode')
      expect(ast.nodes[0]!.nodePosition).toEqual({ x: 100, y: 200 })
    })
  })

  describe('position validation', () => {
    it('should throw on non-number position x', () => {
      expect(() => parse(`
        workflow "test" {
          node test {
            type: TestNode
            position: { x: "invalid", y: 200 }
          }
        }
      `)).toThrow('Position x must be a number literal')
    })

    it('should throw on non-number position y', () => {
      expect(() => parse(`
        workflow "test" {
          node test {
            type: TestNode
            position: { x: 100, y: "invalid" }
          }
        }
      `)).toThrow('Position y must be a number literal')
    })
  })
})
