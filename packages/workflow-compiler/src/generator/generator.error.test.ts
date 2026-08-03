import { describe, it, expect } from 'vitest'
import { CodeGenError } from './index'
import { compile, createTestRegistry, makeRegistry, TestNodeAst } from './generator.fixtures'

describe('CodeGenerator error handling', () => {
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
      nodeRegistry: makeRegistry(TestNodeAst),
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
      nodeRegistry: makeRegistry(TestNodeAst),
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
      nodeRegistry: createTestRegistry(),
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
      nodeRegistry: createTestRegistry(),
    })).toThrow('Division by zero')
  })
})
