import { describe, it, expect } from 'vitest'
import { flowToAst } from './flow-to-ast'
import type { WorkflowNode, WorkflowEdge } from '../types'
import type { INode } from '@sker/workflow'

describe('Flow to AST Adapters', () => {
  const createMockAstNode = (id: string): INode => ({
    id,
    type: 'TestNode',
    position: { x: 0, y: 0 },
    ast: {
      id,
      type: 'TestNode',
      position: { x: 0, y: 0 },
    } as any,
  } as any)

  const createMockFlowNode = (id: string): WorkflowNode => ({
    id,
    type: 'TestNode',
    position: { x: 0, y: 0 },
    data: createMockAstNode(id),
  })

  const createMockFlowEdge = (
    id: string,
    source: string,
    target: string,
    data?: any
  ): WorkflowEdge => ({
    id,
    source,
    target,
    data: {
      edgeType: 'data',
      fromProperty: 'output',
      toProperty: 'input',
      ...data,
    },
  })

  describe('flowToAst', () => {
    it('应该将 React Flow 节点转换为 AST 节点', () => {
      const nodes = [createMockFlowNode('node-1'), createMockFlowNode('node-2')]
      const edges: WorkflowEdge[] = []

      const result = flowToAst(nodes, edges)

      expect(result.nodes).toHaveLength(2)
      expect(result.nodes[0].id).toBe('node-1')
      expect(result.nodes[1].id).toBe('node-2')
    })

    it('应该将 React Flow 边转换为 AST 边', () => {
      const nodes: WorkflowNode[] = []
      const edges = [
        createMockFlowEdge('edge-1', 'node-1', 'node-2', {
          fromProperty: 'output',
          toProperty: 'input',
        }),
      ]

      const result = flowToAst(nodes, edges)

      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].id).toBe('edge-1')
      expect(result.edges[0].from).toBe('node-1')
      expect(result.edges[0].to).toBe('node-2')
      expect(result.edges[0].fromProperty).toBe('output')
      expect(result.edges[0].toProperty).toBe('input')
    })

    it('应该处理边的 weight 属性', () => {
      const nodes: WorkflowNode[] = []
      const edges = [
        createMockFlowEdge('edge-1', 'node-1', 'node-2', {
          weight: 0.8,
        }),
      ]

      const result = flowToAst(nodes, edges)

      expect(result.edges[0].weight).toBe(0.8)
    })

    it('应该处理边的 condition 属性', () => {
      const nodes: WorkflowNode[] = []
      const edges = [
        createMockFlowEdge('edge-1', 'node-1', 'node-2', {
          condition: 'status === "success"',
        }),
      ]

      const result = flowToAst(nodes, edges)

      expect(result.edges[0].condition).toBe('status === "success"')
    })

    it('应该忽略未定义的 fromProperty', () => {
      const nodes: WorkflowNode[] = []
      const edges = [
        createMockFlowEdge('edge-1', 'node-1', 'node-2', {
          fromProperty: undefined,
          toProperty: 'input',
        }),
      ]

      const result = flowToAst(nodes, edges)

      expect(result.edges[0].fromProperty).toBeUndefined()
      expect(result.edges[0].toProperty).toBe('input')
    })

    it('应该抛出错误如果边缺少 data', () => {
      const nodes: WorkflowNode[] = []
      const edges = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
        } as WorkflowEdge,
      ]

      expect(() => flowToAst(nodes, edges)).toThrow('Edge data is required')
    })

    it('应该处理空的节点和边数组', () => {
      const result = flowToAst([], [])

      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('应该同时转换节点和边', () => {
      const nodes = [createMockFlowNode('node-1'), createMockFlowNode('node-2')]
      const edges = [
        createMockFlowEdge('edge-1', 'node-1', 'node-2'),
        createMockFlowEdge('edge-2', 'node-2', 'node-1'),
      ]

      const result = flowToAst(nodes, edges)

      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(2)
      expect(result.edges[0].from).toBe('node-1')
      expect(result.edges[1].from).toBe('node-2')
    })
  })
})
