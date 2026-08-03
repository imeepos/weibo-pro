import { describe, it, expect } from 'vitest'
import { compile } from './compiler'
import { nodeRegistry, SearchNodeAst } from './compiler.fixtures'

describe('WorkflowDSLCompiler', () => {
  describe('semantic validation', () => {
    it('should fail on duplicate node IDs', () => {
      const result = compile(`
        workflow "test" {
          node search { type: SearchNodeAst }
          node search { type: LoginNodeAst }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(false)
      expect(result.errors![0]!.message).toContain('Duplicate node ID')
      expect(result.errors![0]!.message).toContain('search')
    })

    it('should fail on undeclared variable reference', () => {
      const result = compile(`
        workflow "test" {
          node search {
            type: SearchNodeAst
            inputs: { keyword: $undeclared }
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(false)
      expect(result.errors![0]!.message).toContain('Undeclared variable')
      expect(result.errors![0]!.message).toContain('undeclared')
    })

    it('should pass with declared variables', () => {
      const result = compile(`
        workflow "test" {
          variables {
            kw = "test"
          }
          node search {
            type: SearchNodeAst
            inputs: { keyword: $kw }
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(true)
    })

    it('should return dslAst even on validation failure', () => {
      const result = compile(`
        workflow "test" {
          node a { type: LoginNodeAst }
          node a { type: LoginNodeAst }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(false)
      expect(result.dslAst).toBeDefined()
      expect(result.dslAst!.name).toBe('test')
    })
  })

  describe('comprehensive fixes validation', () => {
    it('should handle negative numbers in variables', () => {
      const result = compile(`
        workflow "test" {
          variables {
            temp = -10,
            threshold = -0.5
          }
          node search {
            type: SearchNodeAst
            inputs: {
              maxDelay: $temp
            }
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(true)
      const node = result.workflowGraph!.nodes[0] as SearchNodeAst
      expect(node.maxDelay).toBe(-10)
    })

    it('should validate position types strictly', () => {
      const result = compile(`
        workflow "test" {
          node test {
            type: LoginNodeAst
            position: { x: "100", y: 200 }
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(false)
      expect(result.errors![0]!.message).toContain('Position x must be a number literal')
    })

    it('should handle commas in variables and node properties', () => {
      const result = compile(`
        workflow "test" {
          variables {
            a = 1,
            b = 2
          }
          node test {
            type: LoginNodeAst,
            position: { x: 100, y: 200 }
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(true)
      expect(result.workflowGraph!.nodes[0]!.position).toEqual({ x: 100, y: 200 })
    })

    it('should prevent division by zero', () => {
      const result = compile(`
        workflow "test" {
          variables {
            result = 100 / 0
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(false)
      expect(result.errors![0]!.message).toContain('Division by zero')
    })

    it('should validate binary expression operand types', () => {
      const result = compile(`
        workflow "test" {
          variables {
            invalid = "text" * 5
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(false)
      expect(result.errors![0]!.message).toContain('requires number operands')
    })
  })
})
