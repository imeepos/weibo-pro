import { describe, it, expect } from 'vitest'
import { CodeGenerator } from './index'

describe('CodeGenerator expression evaluation', () => {
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
