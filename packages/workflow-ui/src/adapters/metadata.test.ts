import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getNodeMetadata } from './metadata'
import { root } from '@sker/core'
import { Compiler, type INode } from '@sker/workflow'

// 模拟节点类
class TestNode implements INode {
  id = 'test-node-1'
  type = 'TestAst'
  position = { x: 0, y: 0 }
  state: 'pending' = 'pending'
  count = 0
  emitCount = 0
  error = undefined
  portLabels: Record<string, string> = {}
  metadata?: any
}

class WorkflowGraphTestNode implements INode {
  id = 'workflow-1'
  type = 'WorkflowGraphAst'
  position = { x: 0, y: 0 }
  state: 'pending' = 'pending'
  count = 0
  emitCount = 0
  error = undefined
  portLabels: Record<string, string> = {}
  metadata?: any
  nodes: INode[] = []
  edges: any[] = []
}

describe('getNodeMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该获取已编译节点的元数据', () => {
    const node = new TestNode()
    node.metadata = {
      inputs: [{ propertyKey: 'input1', title: 'Input 1' }],
      outputs: [{ propertyKey: 'output1', title: 'Output 1' }],
      class: { title: 'Test Node', type: 'test' }
    }

    const metadata = getNodeMetadata(node as any)

    expect(metadata.type).toBe('TestAst')
    expect(metadata.label).toBe('Test Node')
    expect(metadata.inputs).toHaveLength(1)
    expect(metadata.outputs).toHaveLength(1)
    expect(metadata.inputs[0]!.property).toBe('input1')
  })

  it('应该格式化缺少标题的端口标签', () => {
    const node = new TestNode()
    node.metadata = {
      inputs: [{ propertyKey: 'userName' }],
      outputs: [{ propertyKey: 'resultData' }],
      class: { title: 'Test', type: 'test' }
    }

    const metadata = getNodeMetadata(node as any)

    expect(metadata.inputs[0]!.label).toBe('User Name')
    expect(metadata.outputs[0]!.label).toBe('Result Data')
  })

  it('应该使用 portLabels 覆盖端口标签', () => {
    const node = new TestNode()
    node.portLabels = { 'input1': 'Custom Input Label' }
    node.metadata = {
      inputs: [{ propertyKey: 'input1', title: 'Default Label' }],
      outputs: [],
      class: { title: 'Test', type: 'test' }
    }

    const metadata = getNodeMetadata(node as any)

    expect(metadata.inputs[0]!.label).toBe('Custom Input Label')
  })

  it('应该处理多输入端口', () => {
    const node = new TestNode()
    node.metadata = {
      inputs: [
        { propertyKey: 'input1', title: 'First Input' },
        { propertyKey: 'input2', isMulti: true }
      ],
      outputs: [],
      class: { title: 'Test', type: 'test' }
    }

    const metadata = getNodeMetadata(node as any)

    expect(metadata.inputs).toHaveLength(2)
    expect(metadata.inputs[0]!.isMulti).toBeUndefined()
    expect(metadata.inputs[1]!.isMulti).toBe(true)
  })

  it('应该处理 null 节点时抛出错误', () => {
    expect(() => getNodeMetadata(null as any)).toThrow('node is null')
  })

  it('应该格式化节点标签', () => {
    const node = new TestNode()
    node.type = 'CustomTestAst'
    node.metadata = {
      inputs: [],
      outputs: [],
      class: { title: undefined, type: 'test' }
    }

    const metadata = getNodeMetadata(node as any)

    expect(metadata.label).toMatch(/Custom Test/)
  })

  it('应该为多输入端口保留 isMulti 属性', () => {
    const node = new TestNode()
    node.metadata = {
      inputs: [
        { propertyKey: 'items', isMulti: true, title: 'Items' }
      ],
      outputs: [],
      class: { title: 'Test', type: 'test' }
    }

    const metadata = getNodeMetadata(node as any)

    expect(metadata.inputs[0]!.isMulti).toBe(true)
  })

  it('应该保留输入类型信息', () => {
    const node = new TestNode()
    node.metadata = {
      inputs: [
        { propertyKey: 'text', type: 'string', title: 'Text' },
        { propertyKey: 'count', type: 'number' }
      ],
      outputs: [],
      class: { title: 'Test', type: 'test' }
    }

    const metadata = getNodeMetadata(node as any)

    expect(metadata.inputs[0]!.type).toBe('string')
    expect(metadata.inputs[1]!.type).toBe('number')
  })
})
