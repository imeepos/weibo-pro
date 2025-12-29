import { describe, it, expect, vi } from 'vitest'
import { Lexer } from '../lexer'
import { Parser } from '../parser'
import { CodeGenerator, CodeGenError } from './index'
import { Ast, Node, Input, Output } from '@sker/workflow'

// Mock node for testing
@Node({ name: 'TestNode', description: 'Test node' })
class TestNodeAst extends Ast {
  @Input() keyword?: string
  @Input() count?: number
  @Output() result?: string
}

@Node({ name: 'AnotherNode', description: 'Another test node' })
class AnotherNodeAst extends Ast {
  @Input() input?: string
  @Output() output?: string
}

describe('CodeGenerator', () => {
  const compile = (code: string, options?: { nodeRegistry?: Map<string, typeof Ast> }) => {
    const lexer = new Lexer(code)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens)
    const ast = parser.parse()
    const generator = new CodeGenerator(options)
    return generator.generate(ast)
  }

  describe('basic generation', () => {
    it('should generate empty workflow', () => {
      const graph = compile('workflow "test" {}', {
        nodeRegistry: new Map([['TestNodeAst', TestNodeAst]]),
      })

      expect(graph.name).toBe('test')
      expect(graph.nodes).toHaveLength(0)
      expect(graph.edges).toHaveLength(0)
    })

    it('should generate workflow with nodes', () => {
      const graph = compile(`
        workflow "test" {
          node test1 {
            type: TestNodeAst
          }
          node test2 {
            type: AnotherNodeAst
          }
        }
      `, {
        nodeRegistry: new Map([
          ['TestNodeAst', TestNodeAst],
          ['AnotherNodeAst', AnotherNodeAst],
        ]),
      })

      expect(graph.nodes).toHaveLength(2)
      expect(graph.nodes[0]!.id).toBe('test1')
      expect(graph.nodes[1]!.id).toBe('test2')
    })

    it('should set node inputs', () => {
      const graph = compile(`
        workflow "test" {
          node search {
            type: TestNodeAst
            inputs: {
              keyword: "AI"
              count: 100
            }
          }
        }
      `, {
        nodeRegistry: new Map([['TestNodeAst', TestNodeAst]]),
      })

      const node = graph.nodes[0] as TestNodeAst
      expect(node.keyword).toBe('AI')
      expect(node.count).toBe(100)
    })

    it('should set node position', () => {
      const graph = compile(`
        workflow "test" {
          node test {
            type: TestNodeAst
            position: { x: 100, y: 200 }
          }
        }
      `, {
        nodeRegistry: new Map([['TestNodeAst', TestNodeAst]]),
      })

      expect(graph.nodes[0]!.position).toEqual({ x: 100, y: 200 })
    })
  })

  describe('connections', () => {
    it('should generate edges', () => {
      const graph = compile(`
        workflow "test" {
          node test1 {
            type: TestNodeAst
          }
          node test2 {
            type: AnotherNodeAst
          }
          test1.result -> test2.input
        }
      `, {
        nodeRegistry: new Map([
          ['TestNodeAst', TestNodeAst],
          ['AnotherNodeAst', AnotherNodeAst],
        ]),
      })

      expect(graph.edges).toHaveLength(1)
      expect(graph.edges[0]!.from).toBe('test1')
      expect(graph.edges[0]!.fromProperty).toBe('result')
      expect(graph.edges[0]!.to).toBe('test2')
      expect(graph.edges[0]!.toProperty).toBe('input')
    })

    it('should generate edge with condition', () => {
      const graph = compile(`
        workflow "test" {
          variables {
            threshold = 0.7
          }
          node analyzer {
            type: TestNodeAst
          }
          node handler {
            type: AnotherNodeAst
          }
          analyzer.result -> handler.input [when: $threshold > 0.5]
        }
      `, {
        nodeRegistry: new Map([
          ['TestNodeAst', TestNodeAst],
          ['AnotherNodeAst', AnotherNodeAst],
        ]),
      })

      expect(graph.edges).toHaveLength(1)
      expect(graph.edges[0]!.condition).toBeDefined()
      expect(graph.edges[0]!.condition).toEqual({ property: 'condition', value: true })
    })

    it('should generate edge with false condition', () => {
      const graph = compile(`
        workflow "test" {
          variables {
            threshold = 0.3
          }
          node analyzer {
            type: TestNodeAst
          }
          node handler {
            type: AnotherNodeAst
          }
          analyzer.result -> handler.input [when: $threshold > 0.5]
        }
      `, {
        nodeRegistry: new Map([
          ['TestNodeAst', TestNodeAst],
          ['AnotherNodeAst', AnotherNodeAst],
        ]),
      })

      expect(graph.edges[0]!.condition).toEqual({ property: 'condition', value: false })
    })

    it('should generate multiple conditional edges', () => {
      const graph = compile(`
        workflow "test" {
          variables {
            score = 0.8
          }
          node analyzer {
            type: TestNodeAst
          }
          node positive {
            type: AnotherNodeAst
          }
          node negative {
            type: AnotherNodeAst
          }
          analyzer.result -> positive.input [when: $score > 0.7]
          analyzer.result -> negative.input [when: $score < 0.3]
        }
      `, {
        nodeRegistry: new Map([
          ['TestNodeAst', TestNodeAst],
          ['AnotherNodeAst', AnotherNodeAst],
        ]),
      })

      expect(graph.edges).toHaveLength(2)
      expect(graph.edges[0]!.condition).toEqual({ property: 'condition', value: true })
      expect(graph.edges[1]!.condition).toEqual({ property: 'condition', value: false })
    })
  })

  describe('variables', () => {
    it('should evaluate variable references', () => {
      const generator = new CodeGenerator()

      // Test expression evaluation directly
      const expr = { type: 'Literal' as const, value: 42 }
      expect(generator.evaluateExpression(expr)).toBe(42)
    })
  })

  describe('expression evaluation', () => {
    it('should evaluate literals', () => {
      const generator = new CodeGenerator()

      expect(generator.evaluateExpression({ type: 'Literal', value: 'hello' })).toBe('hello')
      expect(generator.evaluateExpression({ type: 'Literal', value: 42 })).toBe(42)
      expect(generator.evaluateExpression({ type: 'Literal', value: true })).toBe(true)
      expect(generator.evaluateExpression({ type: 'Literal', value: null })).toBe(null)
    })

    it('should evaluate binary expressions', () => {
      const generator = new CodeGenerator()

      expect(generator.evaluateExpression({
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: 1 },
        right: { type: 'Literal', value: 2 },
      })).toBe(3)

      expect(generator.evaluateExpression({
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'Literal', value: 3 },
        right: { type: 'Literal', value: 4 },
      })).toBe(12)

      expect(generator.evaluateExpression({
        type: 'BinaryExpression',
        operator: '>',
        left: { type: 'Literal', value: 5 },
        right: { type: 'Literal', value: 3 },
      })).toBe(true)
    })

    it('should evaluate object expressions', () => {
      const generator = new CodeGenerator()

      const result = generator.evaluateExpression({
        type: 'Object',
        properties: {
          a: { type: 'Literal', value: 1 },
          b: { type: 'Literal', value: 'hello' },
        },
      })

      expect(result).toEqual({ a: 1, b: 'hello' })
    })

    it('should evaluate array expressions', () => {
      const generator = new CodeGenerator()

      const result = generator.evaluateExpression({
        type: 'Array',
        elements: [
          { type: 'Literal', value: 1 },
          { type: 'Literal', value: 2 },
          { type: 'Literal', value: 3 },
        ],
      })

      expect(result).toEqual([1, 2, 3])
    })
  })

  describe('error handling', () => {
    it('should throw on unknown node type', () => {
      expect(() => compile(`
        workflow "test" {
          node test {
            type: UnknownNodeAst
          }
        }
      `)).toThrow(CodeGenError)
      expect(() => compile(`
        workflow "test" {
          node test {
            type: UnknownNodeAst
          }
        }
      `)).toThrow('Unknown node type')
    })

    it('should throw on unknown source node in connection', () => {
      expect(() => compile(`
        workflow "test" {
          node test {
            type: TestNodeAst
          }
          unknown.output -> test.input
        }
      `, {
        nodeRegistry: new Map([['TestNodeAst', TestNodeAst]]),
      })).toThrow('Unknown source node')
    })

    it('should throw on unknown target node in connection', () => {
      expect(() => compile(`
        workflow "test" {
          node test {
            type: TestNodeAst
          }
          test.output -> unknown.input
        }
      `, {
        nodeRegistry: new Map([['TestNodeAst', TestNodeAst]]),
      })).toThrow('Unknown target node')
    })

    it('should throw on non-number operands in binary expression', () => {
      expect(() => compile(`
        workflow "test" {
          variables {
            invalid = "text" + 5
          }
        }
      `, {
        nodeRegistry: new Map([['TestNodeAst', TestNodeAst]]),
      })).toThrow('requires number operands')
    })

    it('should throw on division by zero', () => {
      expect(() => compile(`
        workflow "test" {
          variables {
            result = 10 / 0
          }
        }
      `, {
        nodeRegistry: new Map([['TestNodeAst', TestNodeAst]]),
      })).toThrow('Division by zero')
    })
  })
})
