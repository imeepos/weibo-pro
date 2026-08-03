import { describe, it, expect } from 'vitest'
import { compile, createTestRegistry } from './generator.fixtures'

describe('CodeGenerator connections', () => {
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
      nodeRegistry: createTestRegistry(),
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
      nodeRegistry: createTestRegistry(),
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
      nodeRegistry: createTestRegistry(),
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
      nodeRegistry: createTestRegistry(),
    })

    expect(graph.edges).toHaveLength(2)
    expect(graph.edges[0]!.condition).toEqual({ property: 'condition', value: true })
    expect(graph.edges[1]!.condition).toEqual({ property: 'condition', value: false })
  })
})
