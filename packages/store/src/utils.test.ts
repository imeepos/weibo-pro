import { describe, it, expect } from 'vitest'
import { isObject, isPlainObject } from './utils'

describe('utils', () => {
  describe('isObject', () => {
    it('识别纯对象', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ a: 1 })).toBe(true)
      expect(isObject(Object.create(null))).toBe(true)
    })

    it('识别类实例为对象', () => {
      class MyClass {}
      expect(isObject(new MyClass())).toBe(true)
      expect(isObject(new Date())).toBe(true)
      expect(isObject(/regex/)).toBe(true)
    })

    it('数组不是对象', () => {
      expect(isObject([])).toBe(false)
      expect(isObject([1, 2, 3])).toBe(false)
    })

    it('原始类型不是对象', () => {
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject(42)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(true)).toBe(false)
      expect(isObject(Symbol())).toBe(false)
    })

    it('函数不是对象（虽然 typeof function 返回 object）', () => {
      expect(isObject(() => {})).toBe(false)
      expect(isObject(function () {})).toBe(false)
    })
  })

  describe('isPlainObject', () => {
    it('识别纯对象', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1, b: 2 })).toBe(true)
      expect(isPlainObject({ nested: { value: 1 } })).toBe(true)
    })

    it('Object.create(null) 是纯对象', () => {
      const obj = Object.create(null)
      expect(isPlainObject(obj)).toBe(true)
    })

    it('类实例不是纯对象', () => {
      class MyClass {}
      expect(isPlainObject(new MyClass())).toBe(false)
    })

    it('内置对象不是纯对象', () => {
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(/regex/)).toBe(false)
      expect(isPlainObject(new Map())).toBe(false)
      expect(isPlainObject(new Set())).toBe(false)
    })

    it('数组不是纯对象', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject([1, 2, 3])).toBe(false)
    })

    it('原始类型不是纯对象', () => {
      expect(isPlainObject(null)).toBe(false)
      expect(isPlainObject(undefined)).toBe(false)
      expect(isPlainObject(42)).toBe(false)
      expect(isPlainObject('string')).toBe(false)
      expect(isPlainObject(true)).toBe(false)
      expect(isPlainObject(Symbol())).toBe(false)
    })

    it('函数不是纯对象', () => {
      expect(isPlainObject(() => {})).toBe(false)
      expect(isPlainObject(function () {})).toBe(false)
    })

    it('通过 Object.create() 创建的自定义原型链对象不是纯对象', () => {
      const proto = { customProp: true }
      const obj = Object.create(proto)
      expect(isPlainObject(obj)).toBe(false)
    })
  })
})
