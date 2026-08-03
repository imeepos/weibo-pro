import { describe, it, expect } from 'vitest'
import { WorkflowDSLCompiler, compile } from './compiler'
import { nodeRegistry } from './compiler.fixtures'

describe('WorkflowDSLCompiler', () => {
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
})
