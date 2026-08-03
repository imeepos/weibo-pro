import { describe, it, expect } from 'vitest'
import { omit, compose } from './utils'

describe('utils omit', () => {
  it('移除对象中的指定键', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = omit(obj, 'b')

    expect(result).toEqual({ a: 1, c: 3 })
    expect(result.b).toBeUndefined()
  })

  it('保持原对象不变', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const _result = omit(obj, 'b')

    expect(obj).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('移除不存在的键返回相同结构', () => {
    const obj = { a: 1, b: 2 }
    const result = omit(obj, 'c' as any)

    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('空对象', () => {
    const result = omit({}, 'a' as any)
    expect(result).toEqual({})
  })
})

describe('utils compose', () => {
  it('无参数时返回恒等函数', () => {
    const composed = compose()
    expect(composed(42)).toBe(42)
    expect(composed('hello')).toBe('hello')
  })

  it('单个函数时返回该函数', () => {
    const double = (x: number) => x * 2
    const composed = compose(double)

    expect(composed(5)).toBe(10)
  })

  it('从右到左组合函数', () => {
    const addOne = (x: number) => x + 1
    const double = (x: number) => x * 2
    const square = (x: number) => x * x

    // square(double(addOne(x)))
    const composed = compose(square, double, addOne)

    expect(composed(3)).toBe(64) // (3 + 1) * 2 = 8, 8^2 = 64
  })

  it('支持不同类型的转换', () => {
    const toString = (x: number) => x.toString()
    const addExclamation = (s: string) => s + '!'
    const toUpperCase = (s: string) => s.toUpperCase()

    const composed = compose(toUpperCase, addExclamation, toString)

    expect(composed(42)).toBe('42!')
  })
})
