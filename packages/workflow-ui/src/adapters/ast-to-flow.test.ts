import { describe, it, expect } from 'vitest'
import { astToFlow, astToFlowNodes, astToFlowEdges } from './ast-to-flow'
import type { INode, IEdge } from '@sker/workflow'

describe('AST to Flow Adapters', () => {
  const createMockNode = (id: string, overrides?: Partial<INode>): INode => ({
    id,
    type: 'TestNode',
    position: { x: 0, y: 0 },
    ...overrides,
  } as INode)

  const createMockEdge = (id: string, from: string, to: string, overrides?: Partial<IEdge>): IEdge => ({
    id,
    from,
    to,
    ...overrides,
  } as IEdge)

  describe('astToFlow', () => {
    it('应该将节点和边数组转换为 React Flow 格式', () => {
      const nodes = [createMockNode('node-1'), createMockNode('node-2')]
      const edges = [createMockEdge('edge-1', 'node-1', 'node-2')]

      const result = astToFlow(nodes, edges)

      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
      expect(result.nodes[0].id).toBe('node-1')
      expect(result.edges[0].source).toBe('node-1')
      expect(result.edges[0].target).toBe('node-2')
    })

    it('应该处理空的节点和边数组', () => {
      const result = astToFlow([], [])
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })
  })

  describe('astToFlowNodes', () => {
    it('应该转换扁平节点结构', () => {
      const nodes = [
        createMockNode('node-1'),
        createMockNode('node-2'),
        createMockNode('node-3'),
      ]

      const result = astToFlowNodes({ nodes })

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('node-1')
      expect(result[1].id).toBe('node-2')
      expect(result[2].id).toBe('node-3')
    })

    it('应该处理分组节点及其子节点', () => {
      const childNode = createMockNode('child-1')
      const groupNode = createMockNode('group-1', {
        isGroupNode: true,
        nodes: [childNode],
      }) as any

      const result = astToFlowNodes({ nodes: [groupNode] })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('group-1')
      expect(result[0].type).toBe('GroupNode')
      expect(result[1].id).toBe('child-1')
      expect(result[1].parentId).toBe('group-1')
      expect(result[1].extent).toBe('parent')
    })

    it('应该递归处理嵌套分组节点', () => {
      const nestedChild = createMockNode('nested-child')
      const childGroup = createMockNode('child-group', {
        isGroupNode: true,
        nodes: [nestedChild],
      }) as any
      const parentGroup = createMockNode('parent-group', {
        isGroupNode: true,
        nodes: [childGroup],
      }) as any

      const result = astToFlowNodes({ nodes: [parentGroup] })

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('parent-group')
      expect(result[1].id).toBe('child-group')
      expect(result[1].parentId).toBe('parent-group')
      expect(result[2].id).toBe('nested-child')
      expect(result[2].parentId).toBe('child-group')
    })

    it('应该设置默认位置为 (0,0)', () => {
      const nodeWithoutPosition = createMockNode('node-1', { position: undefined })
      const result = astToFlowNodes({ nodes: [nodeWithoutPosition] })

      expect(result[0].position).toEqual({ x: 0, y: 0 })
    })

    it('应该保留节点的宽度和高度属性', () => {
      const groupNode = createMockNode('group-1', {
        isGroupNode: true,
        width: 300,
        height: 200,
      })

      const result = astToFlowNodes({ nodes: [groupNode] })

      expect(result[0].width).toBe(300)
      expect(result[0].height).toBe(200)
    })
  })

  describe('astToFlowEdges', () => {
    it('应该转换顶级边', () => {
      const edges = [
        createMockEdge('edge-1', 'node-1', 'node-2'),
        createMockEdge('edge-2', 'node-2', 'node-3'),
      ]

      const result = astToFlowEdges({ nodes: [], edges })

      expect(result).toHaveLength(2)
      expect(result[0].source).toBe('node-1')
      expect(result[1].target).toBe('node-3')
    })

    it('应该从分组节点内收集边', () => {
      const childNode = createMockNode('child-1')
      const groupEdge = createMockEdge('edge-inner', 'child-1', 'child-2')
      const groupNode = createMockNode('group-1', {
        isGroupNode: true,
        nodes: [childNode],
        edges: [groupEdge],
      }) as any

      const topLevelEdge = createMockEdge('edge-1', 'node-1', 'group-1')

      const result = astToFlowEdges({
        nodes: [groupNode],
        edges: [topLevelEdge],
      })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('edge-1')
      expect(result[1].id).toBe('edge-inner')
    })

    it('应该递归收集嵌套分组内的边', () => {
      const nestedChild = createMockNode('nested-child')
      const nestedEdge = createMockEdge('edge-nested', 'nested-child', 'nested-child-2')
      const childGroup = createMockNode('child-group', {
        isGroupNode: true,
        nodes: [nestedChild],
        edges: [nestedEdge],
      }) as any
      const parentGroup = createMockNode('parent-group', {
        isGroupNode: true,
        nodes: [childGroup],
        edges: [],
      }) as any

      const result = astToFlowEdges({
        nodes: [parentGroup],
        edges: [],
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('edge-nested')
    })

    it('应该确定边类型为 data 如果有 fromProperty 或 toProperty', () => {
      const edges = [
        createMockEdge('edge-1', 'node-1', 'node-2', {
          fromProperty: 'output',
          toProperty: 'input',
        }),
      ]

      const result = astToFlowEdges({ nodes: [], edges })

      expect(result[0].data?.edgeType).toBe('data')
      expect(result[0].type).toBe('workflow-data-edge')
    })

    it('应该确定边类型为 control 如果没有属性映射', () => {
      const edges = [createMockEdge('edge-1', 'node-1', 'node-2')]

      const result = astToFlowEdges({ nodes: [], edges })

      expect(result[0].data?.edgeType).toBe('control')
      expect(result[0].type).toBe('workflow-control-edge')
    })

    it('应该保留边的 condition 和 weight', () => {
      const edges = [
        createMockEdge('edge-1', 'node-1', 'node-2', {
          condition: 'status === "success"',
          weight: 0.8,
        }),
      ]

      const result = astToFlowEdges({ nodes: [], edges })

      expect(result[0].data?.condition).toBe('status === "success"')
      expect(result[0].data?.weight).toBe(0.8)
    })
  })
})
