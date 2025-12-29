import { describe, it, expect } from 'vitest'
import { WorkflowDSLCompiler, compile } from './compiler'
import { Ast, Node, Input, Output } from '@sker/workflow'

// Test nodes
@Node({ name: 'LoginNode', description: 'Login node' })
class LoginNodeAst extends Ast {
  @Output() account?: string
}

@Node({ name: 'SearchNode', description: 'Search node' })
class SearchNodeAst extends Ast {
  @Input() account?: string
  @Input() keyword?: string
  @Input() maxDelay?: number
  @Output() results?: string[]
}

@Node({ name: 'AnalyzerNode', description: 'Analyzer node' })
class AnalyzerNodeAst extends Ast {
  @Input() data?: string[]
  @Output() sentiment?: number
}

describe('WorkflowDSLCompiler', () => {
  const nodeRegistry = new Map<string, typeof Ast>([
    ['LoginNodeAst', LoginNodeAst],
    ['SearchNodeAst', SearchNodeAst],
    ['AnalyzerNodeAst', AnalyzerNodeAst],
  ])

  describe('successful compilation', () => {
    it('should compile basic workflow', () => {
      const result = compile(`
        workflow "Basic Test" {
          node login {
            type: LoginNodeAst
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(true)
      expect(result.workflowGraph).toBeDefined()
      expect(result.workflowGraph!.name).toBe('Basic Test')
      expect(result.workflowGraph!.nodes).toHaveLength(1)
    })

    it('should compile workflow with connections', () => {
      const result = compile(`
        workflow "Connected Workflow" {
          node login {
            type: LoginNodeAst
            position: { x: 100, y: 100 }
          }

          node search {
            type: SearchNodeAst
            inputs: {
              keyword: "AI"
              maxDelay: 3000
            }
            position: { x: 300, y: 100 }
          }

          login.account -> search.account
        }
      `, { nodeRegistry })

      expect(result.success).toBe(true)
      expect(result.workflowGraph!.nodes).toHaveLength(2)
      expect(result.workflowGraph!.edges).toHaveLength(1)

      const edge = result.workflowGraph!.edges[0]!
      expect(edge.fromProperty).toBe('account')
      expect(edge.toProperty).toBe('account')
    })

    it('should compile workflow with variables', () => {
      const result = compile(`
        workflow "Variable Test" {
          variables {
            searchKeyword = "Machine Learning"
            delay = 5000
          }

          node search {
            type: SearchNodeAst
          }
        }
      `, { nodeRegistry })

      expect(result.success).toBe(true)
      expect(result.dslAst!.variables).toHaveLength(2)
    })

    it('should return DSL AST', () => {
      const result = compile(`
        workflow "AST Test" {
          node login {
            type: LoginNodeAst
          }
        }
      `, { nodeRegistry })

      expect(result.dslAst).toBeDefined()
      expect(result.dslAst!.type).toBe('Workflow')
      expect(result.dslAst!.name).toBe('AST Test')
    })
  })

  describe('error handling', () => {
    it('should return lexer errors', () => {
      const result = compile('workflow "unterminated')

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0]!.message).toContain('Unterminated string')
      expect(result.errors![0]!.severity).toBe('error')
    })

    it('should return parser errors', () => {
      const result = compile('workflow {}')

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0]!.message).toContain('Expected STRING')
    })

    it('should return codegen errors', () => {
      const result = compile(`
        workflow "test" {
          node test {
            type: NonExistentNode
          }
        }
      `)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0]!.message).toContain('Unknown node type')
    })

    it('should include line and column in errors', () => {
      const result = compile(`workflow
        "test" {
          node login {
            type: LoginNodeAst
          }
          unknown.port -> login.account
        }
      `, { nodeRegistry })

      expect(result.success).toBe(false)
      expect(result.errors![0]!.line).toBeGreaterThanOrEqual(0)
    })
  })

  describe('complex workflows', () => {
    it('should compile multi-node workflow', () => {
      const result = compile(`
        workflow "Weibo Analysis Pipeline" {
          node login {
            type: LoginNodeAst
            position: { x: 100, y: 100 }
          }

          node search {
            type: SearchNodeAst
            inputs: {
              keyword: "AI"
              maxDelay: 3000
            }
            position: { x: 300, y: 100 }
          }

          node analyzer {
            type: AnalyzerNodeAst
            position: { x: 500, y: 100 }
          }

          login.account -> search.account
          search.results -> analyzer.data
        }
      `, { nodeRegistry })

      expect(result.success).toBe(true)
      expect(result.workflowGraph!.nodes).toHaveLength(3)
      expect(result.workflowGraph!.edges).toHaveLength(2)
    })
  })

  describe('WorkflowDSLCompiler class', () => {
    it('should be reusable', () => {
      const compiler = new WorkflowDSLCompiler({ nodeRegistry })

      const result1 = compiler.compile('workflow "test1" { node n { type: LoginNodeAst } }')
      const result2 = compiler.compile('workflow "test2" { node n { type: SearchNodeAst } }')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.workflowGraph!.name).toBe('test1')
      expect(result2.workflowGraph!.name).toBe('test2')
    })
  })

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
