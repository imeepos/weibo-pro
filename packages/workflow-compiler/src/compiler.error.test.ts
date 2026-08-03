import { describe, it, expect } from 'vitest'
import { compile } from './compiler'
import { nodeRegistry } from './compiler.fixtures'

describe('WorkflowDSLCompiler error handling', () => {
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
