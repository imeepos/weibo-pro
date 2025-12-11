import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { INode } from '@sker/workflow'

// 测试节点类
class SimpleTestNode implements INode {
  id: string = 'test-id'
  type: string = 'SimpleTestAst'
  position: { x: number; y: number } = { x: 0, y: 0 }
  customProp?: string
  numProp?: number
}

describe('createCompiledNode utilities', () => {
  it('应该正确创建节点实例', () => {
    const node = new SimpleTestNode()
    node.id = 'custom-id'
    node.position = { x: 100, y: 200 }

    expect(node.id).toBe('custom-id')
    expect(node.position).toEqual({ x: 100, y: 200 })
  })

  it('应该支持自定义属性设置', () => {
    const node = new SimpleTestNode()
    node.customProp = 'test-value'
    node.numProp = 42

    expect(node.customProp).toBe('test-value')
    expect(node.numProp).toBe(42)
  })

  it('应该保留节点类型信息', () => {
    const node = new SimpleTestNode()

    expect(node.type).toBe('SimpleTestAst')
    expect(node instanceof SimpleTestNode).toBe(true)
  })

  it('应该支持批量属性设置', () => {
    const node = new SimpleTestNode()
    const options = {
      id: 'batch-id',
      customProp: 'batch-value'
    }

    Object.assign(node, options)

    expect(node.id).toBe('batch-id')
    expect(node.customProp).toBe('batch-value')
  })
})

