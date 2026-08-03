import { describe, it, expect } from 'vitest'
import { CodeGenerator } from './index'
import { TestNodeAst, AnotherNodeAst, compile, createTestRegistry, makeRegistry } from './generator.fixtures'

describe('CodeGenerator', () => {
  describe('basic generation', () => {
    it('should generate empty workflow', () => {
      const graph = compile('workflow "test" {}', {
        nodeRegistry: makeRegistry(TestNodeAst),
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
        nodeRegistry: createTestRegistry(),
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
              limit: 100
            }
          }
        }
      `, {
        nodeRegistry: makeRegistry(TestNodeAst),
      })

      const node = graph.nodes[0] as TestNodeAst
      expect(node.keyword).toBe('AI')
      expect(node.limit).toBe(100)
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
        nodeRegistry: makeRegistry(TestNodeAst),
      })

      expect(graph.nodes[0]!.position).toEqual({ x: 100, y: 200 })
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
})
