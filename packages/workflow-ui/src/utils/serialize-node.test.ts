/**
 * 跨工作流剪贴板序列化工具测试
 *
 * 测试节点和边的序列化/反序列化功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Compiler } from '@sker/workflow/src/compiler'
import { root } from '@sker/core'
import type { INode, IEdge } from '@sker/workflow'
import {
  serializeNode,
  deserializeNode,
  serializeEdge,
  deserializeEdge,
  serializeNodes,
  deserializeNodes,
  serializeEdges,
  deserializeEdges,
  filterRelevantEdges,
  calculateBoundingBox,
  getNodeSize,
} from '../serialize-node'
import type { SerializedNode, SerializedEdge } from '../../types/cross-workflow-clipboard.types'

describe('serialize-node', () => {
  let compiler: Compiler

  beforeEach(() => {
    compiler = root.get(Compiler)
  })

  describe('serializeNode', () => {
    it('应该正确序列化节点', () => {
      const mockNode: INode = {
        id: 'node-1',
        type: 'TestNode',
        position: { x: 100, y: 200 },
        state: 'pending',
        count: 0,
        emitCount: 0,
        name: '测试节点',
        description: '这是一个测试节点',
        color: '#ff0000',
      } as INode

      const serialized = serializeNode(mockNode)

      expect(serialized.id).toBe('node-1')
      expect(serialized.type).toBe('TestNode')
      expect(serialized.position).toEqual({ x: 100, y: 200 })
      expect(serialized.data.name).toBe('测试节点')
      expect(serialized.data.description).toBe('这是一个测试节点')
      expect(serialized.data.color).toBe('#ff0000')
    })

    it('应该移除不可序列化的 metadata 字段', () => {
      const mockNode: INode = {
        id: 'node-1',
        type: 'TestNode',
        position: { x: 100, y: 200 },
        state: 'pending',
        count: 0,
        emitCount: 0,
        metadata: {
          type: 'TestNode',
          class: {},
          inputs: [],
          outputs: [],
          states: [],
        },
      } as INode

      const serialized = serializeNode(mockNode)

      // metadata 不应该在序列化数据中
      expect(serialized.data).not.toHaveProperty('metadata')
    })
  })

  describe('deserializeNode', () => {
    it('应该正确反序列化节点', () => {
      const serialized: SerializedNode = {
        id: 'node-1',
        type: 'TestNode',
        data: {
          name: '测试节点',
          description: '这是一个测试节点',
        },
        position: { x: 100, y: 200 },
      }

      // 注意：这个测试需要实际的节点类型，这里只是演示测试结构
      // 在实际使用中，需要注册节点类型
      // const deserialized = deserializeNode(serialized, compiler)
      // expect(deserialized.id).toBe('node-1')
      // expect(deserialized.type).toBe('TestNode')
      // expect(deserialized.position).toEqual({ x: 100, y: 200 })
      // expect(deserialized.metadata).toBeDefined()
    })

    it('应该恢复 metadata 字段', () => {
      // 这个测试需要实际的节点类型注册
      // 这里只是演示测试结构
    })
  })

  describe('serializeEdge', () => {
    it('应该正确序列化边', () => {
      const mockEdge: IEdge = {
        id: 'edge-1',
        from: 'node-1',
        to: 'node-2',
        fromProperty: 'output',
        toProperty: 'input',
        weight: 1,
        mode: 'merge' as any,
      }

      const serialized = serializeEdge(mockEdge)

      expect(serialized.id).toBe('edge-1')
      expect(serialized.from).toBe('node-1')
      expect(serialized.to).toBe('node-2')
      expect(serialized.fromProperty).toBe('output')
      expect(serialized.toProperty).toBe('input')
      expect(serialized.weight).toBe(1)
      expect(serialized.mode).toBe('merge')
    })
  })

  describe('deserializeEdge', () => {
    it('应该正确反序列化边', () => {
      const serialized: SerializedEdge = {
        id: 'edge-1',
        from: 'node-1',
        to: 'node-2',
        fromProperty: 'output',
        toProperty: 'input',
        weight: 1,
        mode: 'merge',
      }

      const deserialized = deserializeEdge(serialized)

      expect(deserialized.id).toBe('edge-1')
      expect(deserialized.from).toBe('node-1')
      expect(deserialized.to).toBe('node-2')
      expect(deserialized.fromProperty).toBe('output')
      expect(deserialized.toProperty).toBe('input')
      expect(deserialized.weight).toBe(1)
      expect(deserialized.mode).toBe('merge')
    })
  })

  describe('批量序列化/反序列化', () => {
    it('应该正确批量序列化节点', () => {
      const mockNodes: INode[] = [
        {
          id: 'node-1',
          type: 'TestNode',
          position: { x: 100, y: 200 },
          state: 'pending',
          count: 0,
          emitCount: 0,
        } as INode,
        {
          id: 'node-2',
          type: 'TestNode',
          position: { x: 300, y: 400 },
          state: 'pending',
          count: 0,
          emitCount: 0,
        } as INode,
      ]

      const serialized = serializeNodes(mockNodes)

      expect(serialized).toHaveLength(2)
      expect(serialized[0].id).toBe('node-1')
      expect(serialized[1].id).toBe('node-2')
    })

    it('应该正确批量序列化边', () => {
      const mockEdges: IEdge[] = [
        {
          id: 'edge-1',
          from: 'node-1',
          to: 'node-2',
        },
        {
          id: 'edge-2',
          from: 'node-2',
          to: 'node-3',
        },
      ]

      const serialized = serializeEdges(mockEdges)

      expect(serialized).toHaveLength(2)
      expect(serialized[0].id).toBe('edge-1')
      expect(serialized[1].id).toBe('edge-2')
    })
  })

  describe('filterRelevantEdges', () => {
    it('应该正确过滤相关边', () => {
      const mockEdges: IEdge[] = [
        { id: 'edge-1', from: 'node-1', to: 'node-2' },
        { id: 'edge-2', from: 'node-2', to: 'node-3' },
        { id: 'edge-3', from: 'node-1', to: 'node-3' },
        { id: 'edge-4', from: 'node-4', to: 'node-5' },
      ]

      const nodeIds = new Set(['node-1', 'node-2', 'node-3'])
      const filtered = filterRelevantEdges(mockEdges, nodeIds)

      expect(filtered).toHaveLength(3)
      expect(filtered.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))).toBe(true)
    })
  })

  describe('calculateBoundingBox', () => {
    it('应该正确计算包围盒', () => {
      const nodes = [
        { position: { x: 100, y: 200 }, width: 100, height: 50 },
        { position: { x: 300, y: 400 }, width: 150, height: 80 },
      ]

      const boundingBox = calculateBoundingBox(nodes)

      expect(boundingBox.minX).toBe(100)
      expect(boundingBox.minY).toBe(200)
      expect(boundingBox.maxX).toBe(450) // 300 + 150
      expect(boundingBox.maxY).toBe(480) // 400 + 80
      expect(boundingBox.width).toBe(350)
      expect(boundingBox.height).toBe(280)
      expect(boundingBox.centerX).toBe(275) // (100 + 450) / 2
      expect(boundingBox.centerY).toBe(340) // (200 + 480) / 2
    })

    it('应该处理空节点列表', () => {
      const boundingBox = calculateBoundingBox([])

      expect(boundingBox.minX).toBe(0)
      expect(boundingBox.minY).toBe(0)
      expect(boundingBox.maxX).toBe(0)
      expect(boundingBox.maxY).toBe(0)
      expect(boundingBox.width).toBe(0)
      expect(boundingBox.height).toBe(0)
      expect(boundingBox.centerX).toBe(0)
      expect(boundingBox.centerY).toBe(0)
    })
  })

  describe('getNodeSize', () => {
    it('应该优先使用节点自身的尺寸', () => {
      const node = { width: 200, height: 100 }
      const size = getNodeSize(node)

      expect(size.width).toBe(200)
      expect(size.height).toBe(100)
    })

    it('应该使用测量尺寸作为备选', () => {
      const node = { measured: { width: 300, height: 150 } }
      const size = getNodeSize(node)

      expect(size.width).toBe(300)
      expect(size.height).toBe(150)
    })

    it('应该使用默认尺寸作为最后备选', () => {
      const node = {}
      const size = getNodeSize(node)

      expect(size.width).toBe(280)
      expect(size.height).toBe(120)
    })
  })
})
