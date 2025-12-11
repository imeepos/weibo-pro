import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCompiledNode, createCompiledNodes } from './createCompiledNode'
import type { INode } from '@sker/workflow'

// 测试节点类
class SimpleTestNode implements INode {
  id: string = 'test-id'
  type: string = 'SimpleTestAst'
  position: { x: number; y: number } = { x: 0, y: 0 }
  customProp?: string
  numProp?: number
}

class NodeWithMetadata implements INode {
  id: string = 'node-with-meta'
  type: string = 'NodeWithMetadataAst'
  position: { x: number; y: number } = { x: 0, y: 0 }
  metadata?: any
}

describe('createCompiledNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该创建带有生成 ID 的节点', () => {
    const node = createCompiledNode(SimpleTestNode)

    expect(node).toBeInstanceOf(SimpleTestNode)
    expect(node.id).toBeDefined()
    expect(typeof node.id).toBe('string')
    expect(node.id.length).toBeGreaterThan(0)
  })

  it('应该使用提供的 ID', () => {
    const customId = 'custom-test-id-123'
    const node = createCompiledNode(SimpleTestNode, { id: customId })

    expect(node.id).toBe(customId)
  })

  it('应该设置节点位置', () => {
    const position = { x: 100, y: 200 }
    const node = createCompiledNode(SimpleTestNode, { position })

    expect(node.position).toEqual(position)
  })

  it('应该设置自定义属性', () => {
    const node = createCompiledNode(SimpleTestNode, {
      customProp: 'test-value',
      numProp: 42
    })

    expect(node.customProp).toBe('test-value')
    expect(node.numProp).toBe(42)
  })

  it('应该忽略 id 和 position 之外的特殊属性', () => {
    const node = createCompiledNode(SimpleTestNode, {
      id: 'test-id',
      position: { x: 10, y: 20 },
      customProp: 'value'
    })

    expect(node.id).toBe('test-id')
    expect(node.position).toEqual({ x: 10, y: 20 })
    expect(node.customProp).toBe('value')
  })

  it('应该编译节点', () => {
    const node = createCompiledNode(NodeWithMetadata)

    // 编译后的节点应该有 metadata
    expect(node).toBeDefined()
    expect(node.type).toBe('NodeWithMetadataAst')
  })

  it('应该保留默认位置当未提供时', () => {
    const node = createCompiledNode(SimpleTestNode, { id: 'test' })

    // 如果未设置位置，应该保持默认值 { x: 0, y: 0 }
    expect(node.position).toBeDefined()
    expect(typeof node.position.x).toBe('number')
    expect(typeof node.position.y).toBe('number')
  })

  it('应该不设置不存在的属性', () => {
    const node = createCompiledNode(SimpleTestNode, {
      nonExistentProp: 'value'
    })

    expect((node as any).nonExistentProp).toBeUndefined()
  })

  it('应该接受空选项对象', () => {
    const node = createCompiledNode(SimpleTestNode, {})

    expect(node).toBeInstanceOf(SimpleTestNode)
    expect(node.id).toBeDefined()
  })

  it('应该处理多个自定义属性', () => {
    const node = createCompiledNode(SimpleTestNode, {
      id: 'multi-prop-test',
      position: { x: 50, y: 75 },
      customProp: 'custom-value',
      numProp: 99
    })

    expect(node.id).toBe('multi-prop-test')
    expect(node.position).toEqual({ x: 50, y: 75 })
    expect(node.customProp).toBe('custom-value')
    expect(node.numProp).toBe(99)
  })
})

describe('createCompiledNodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该创建空节点数组', () => {
    const nodes = createCompiledNodes([])

    expect(Array.isArray(nodes)).toBe(true)
    expect(nodes).toHaveLength(0)
  })

  it('应该创建单个节点', () => {
    const nodes = createCompiledNodes([
      { NodeClass: SimpleTestNode }
    ])

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toBeInstanceOf(SimpleTestNode)
  })

  it('应该创建多个节点', () => {
    const nodes = createCompiledNodes([
      { NodeClass: SimpleTestNode, options: { id: 'node-1' } },
      { NodeClass: NodeWithMetadata, options: { id: 'node-2' } },
      { NodeClass: SimpleTestNode, options: { id: 'node-3' } }
    ])

    expect(nodes).toHaveLength(3)
    expect(nodes[0].id).toBe('node-1')
    expect(nodes[1].id).toBe('node-2')
    expect(nodes[2].id).toBe('node-3')
  })

  it('应该为每个节点应用不同的选项', () => {
    const nodes = createCompiledNodes([
      {
        NodeClass: SimpleTestNode,
        options: {
          id: 'custom-1',
          customProp: 'value-1'
        }
      },
      {
        NodeClass: SimpleTestNode,
        options: {
          id: 'custom-2',
          customProp: 'value-2'
        }
      }
    ])

    expect(nodes[0].id).toBe('custom-1')
    expect(nodes[0].customProp).toBe('value-1')
    expect(nodes[1].id).toBe('custom-2')
    expect(nodes[1].customProp).toBe('value-2')
  })

  it('应该处理没有选项的节点', () => {
    const nodes = createCompiledNodes([
      { NodeClass: SimpleTestNode },
      { NodeClass: SimpleTestNode }
    ])

    expect(nodes).toHaveLength(2)
    expect(nodes[0].id).toBeDefined()
    expect(nodes[1].id).toBeDefined()
    expect(nodes[0].id).not.toBe(nodes[1].id)
  })

  it('应该保持节点顺序', () => {
    const nodes = createCompiledNodes([
      { NodeClass: SimpleTestNode, options: { id: 'first' } },
      { NodeClass: SimpleTestNode, options: { id: 'second' } },
      { NodeClass: SimpleTestNode, options: { id: 'third' } }
    ])

    expect(nodes[0].id).toBe('first')
    expect(nodes[1].id).toBe('second')
    expect(nodes[2].id).toBe('third')
  })
})
