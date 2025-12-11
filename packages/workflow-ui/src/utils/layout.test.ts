import { describe, it, expect, beforeEach } from 'vitest'
import { calculateDagreLayout } from './layout'
import type { WorkflowNode, WorkflowEdge } from '../types'
import type { INode } from '@sker/workflow'

// 创建测试节点
function createTestNode(id: string, collapsed = false): WorkflowNode {
  const node: any = {
    id,
    type: 'TestAst',
    position: { x: 0, y: 0 },
    data: {
      id,
      collapsed,
      metadata: {
        inputs: [
          { propertyKey: 'input1' },
          { propertyKey: 'input2' }
        ],
        outputs: [
          { propertyKey: 'output1' }
        ]
      }
    }
  }
  return node
}

function createTestEdge(source: string, target: string, id?: string): WorkflowEdge {
  return {
    id: id || `${source}-${target}`,
    source,
    target,
    sourceHandle: 'output1',
    targetHandle: 'input1',
    type: 'workflow-data-edge',
    data: {}
  }
}

describe('Layout Utils', () => {
  describe('calculateDagreLayout', () => {
    it('应该为单个节点计算位置', () => {
      const nodes = [createTestNode('node-1')]
      const edges: WorkflowEdge[] = []

      const positions = calculateDagreLayout(nodes, edges)

      expect(positions.has('node-1')).toBe(true)
      const pos = positions.get('node-1')
      expect(pos).toHaveProperty('x')
      expect(pos).toHaveProperty('y')
      expect(typeof pos?.x).toBe('number')
      expect(typeof pos?.y).toBe('number')
    })

    it('应该为多个节点计算不同的位置', () => {
      const nodes = [
        createTestNode('node-1'),
        createTestNode('node-2')
      ]
      const edges = [createTestEdge('node-1', 'node-2')]

      const positions = calculateDagreLayout(nodes, edges)

      expect(positions.has('node-1')).toBe(true)
      expect(positions.has('node-2')).toBe(true)

      const pos1 = positions.get('node-1')!
      const pos2 = positions.get('node-2')!

      // 由于 node-1 -> node-2，node-2 应该在 node-1 下方（y 坐标更大）
      expect(pos2.y).toBeGreaterThanOrEqual(pos1.y)
    })

    it('应该处理线性工作流图', () => {
      const nodes = [
        createTestNode('node-1'),
        createTestNode('node-2'),
        createTestNode('node-3')
      ]
      const edges = [
        createTestEdge('node-1', 'node-2'),
        createTestEdge('node-2', 'node-3')
      ]

      const positions = calculateDagreLayout(nodes, edges)

      const pos1 = positions.get('node-1')!
      const pos2 = positions.get('node-2')!
      const pos3 = positions.get('node-3')!

      // 节点应该从上到下排列
      expect(pos1.y).toBeLessThan(pos2.y)
      expect(pos2.y).toBeLessThan(pos3.y)
    })

    it('应该处理分支工作流图', () => {
      const nodes = [
        createTestNode('start'),
        createTestNode('branch-1'),
        createTestNode('branch-2'),
        createTestNode('merge')
      ]
      const edges = [
        createTestEdge('start', 'branch-1'),
        createTestEdge('start', 'branch-2'),
        createTestEdge('branch-1', 'merge'),
        createTestEdge('branch-2', 'merge')
      ]

      const positions = calculateDagreLayout(nodes, edges)

      expect(positions.size).toBe(4)
      positions.forEach((pos) => {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeGreaterThanOrEqual(0)
      })
    })

    it('应该处理折叠的节点', () => {
      const nodes = [
        createTestNode('node-1', false),
        createTestNode('node-2', true)  // 折叠的节点
      ]
      const edges = [createTestEdge('node-1', 'node-2')]

      const positions = calculateDagreLayout(nodes, edges)

      expect(positions.has('node-1')).toBe(true)
      expect(positions.has('node-2')).toBe(true)
      expect(positions.size).toBe(2)
    })

    it('应该处理没有边的多个节点', () => {
      const nodes = [
        createTestNode('node-1'),
        createTestNode('node-2'),
        createTestNode('node-3')
      ]
      const edges: WorkflowEdge[] = []

      const positions = calculateDagreLayout(nodes, edges)

      expect(positions.size).toBe(3)
    })

    it('应该返回所有节点的位置', () => {
      const nodes = [
        createTestNode('A'),
        createTestNode('B'),
        createTestNode('C'),
        createTestNode('D')
      ]
      const edges = [
        createTestEdge('A', 'B'),
        createTestEdge('A', 'C'),
        createTestEdge('B', 'D'),
        createTestEdge('C', 'D')
      ]

      const positions = calculateDagreLayout(nodes, edges)

      expect(positions.size).toBe(4)
      nodes.forEach(node => {
        expect(positions.has(node.id)).toBe(true)
      })
    })

    it('应该为返回的位置设置非负坐标', () => {
      const nodes = [
        createTestNode('node-1'),
        createTestNode('node-2'),
        createTestNode('node-3')
      ]
      const edges = [
        createTestEdge('node-1', 'node-2'),
        createTestEdge('node-2', 'node-3')
      ]

      const positions = calculateDagreLayout(nodes, edges)

      positions.forEach((pos) => {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeGreaterThanOrEqual(0)
      })
    })

    it('应该处理复杂的 DAG 结构', () => {
      const nodes = [
        createTestNode('input'),
        createTestNode('process-1'),
        createTestNode('process-2'),
        createTestNode('merge'),
        createTestNode('output')
      ]
      const edges = [
        createTestEdge('input', 'process-1'),
        createTestEdge('input', 'process-2'),
        createTestEdge('process-1', 'merge'),
        createTestEdge('process-2', 'merge'),
        createTestEdge('merge', 'output')
      ]

      const positions = calculateDagreLayout(nodes, edges)

      expect(positions.size).toBe(5)

      // 验证拓扑顺序
      const inputPos = positions.get('input')!
      const mergePos = positions.get('merge')!
      const outputPos = positions.get('output')!

      expect(inputPos.y).toBeLessThan(mergePos.y)
      expect(mergePos.y).toBeLessThan(outputPos.y)
    })
  })
})
