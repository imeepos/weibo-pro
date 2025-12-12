import { describe, it, expect, vi } from 'vitest'
import { validateEdge, validateEdges, validateEdgesDetailed, EDGE_VALIDATION_RULES } from './edgeValidator'
import type { Edge } from '@xyflow/react'
import type { INode } from '@sker/workflow'

describe('Edge Validator', () => {
  const createMockNode = (id: string, overrides?: Partial<INode>): INode => ({
    id,
    type: 'TestNode',
    position: { x: 0, y: 0 },
    metadata: {
      inputs: [
        { property: 'input1', mode: 0 },
        { property: 'input2', mode: 1 },
      ],
      outputs: [],
      nodeClass: 'TestNode',
      title: 'Test Node',
    },
    ...overrides,
  } as any)

  const createMockEdge = (id: string, source: string, target: string): Edge => ({
    id,
    source,
    target,
    sourceHandle: null,
    targetHandle: null,
  })

  describe('validateEdge', () => {
    it('应该验证节点存在规则', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'node-2')
      const nodes = [createMockNode('node-1'), createMockNode('node-2')]

      const result = validateEdge(edge, nodes, [])

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测不存在的源节点', () => {
      const edge = createMockEdge('edge-1', 'unknown', 'node-2')
      const nodes = [createMockNode('node-2')]

      const result = validateEdge(edge, nodes, [])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('源节点或目标节点不存在')
    })

    it('应该检测不存在的目标节点', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'unknown')
      const nodes = [createMockNode('node-1')]

      const result = validateEdge(edge, nodes, [])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('源节点或目标节点不存在')
    })

    it('应该禁止自连接', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'node-1')
      const nodes = [createMockNode('node-1')]

      const result = validateEdge(edge, nodes, [])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('不允许节点连接到自己')
    })

    it('应该检测重复连接', () => {
      const edge1 = createMockEdge('edge-1', 'node-1', 'node-2')
      const edge2 = createMockEdge('edge-2', 'node-1', 'node-2')
      const nodes = [createMockNode('node-1'), createMockNode('node-2')]
      const edges = [edge1]

      const result = validateEdge(edge2, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('不允许重复连接')
    })

    it('应该允许相同源和目标但不同的 handles', () => {
      const edge1: Edge = createMockEdge('edge-1', 'node-1', 'node-2')
      edge1.sourceHandle = 'output1'
      edge1.targetHandle = 'input1'

      const edge2: Edge = createMockEdge('edge-2', 'node-1', 'node-2')
      edge2.sourceHandle = 'output2'
      edge2.targetHandle = 'input2'

      const nodes = [createMockNode('node-1'), createMockNode('node-2')]
      const edges = [edge1]

      const result = validateEdge(edge2, nodes, edges)

      expect(result.valid).toBe(true)
    })

    it('应该处理单输入端口的多连接限制', () => {
      const edge1 = createMockEdge('edge-1', 'node-1', 'node-2')
      edge1.targetHandle = 'input1'

      const edge2 = createMockEdge('edge-2', 'node-3', 'node-2')
      edge2.targetHandle = 'input1'

      const nodes = [
        createMockNode('node-1'),
        createMockNode('node-2'),
        createMockNode('node-3'),
      ]
      const edges = [edge1]

      const result = validateEdge(edge2, nodes, edges)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('此输入端口不支持多条连接')
    })

    it('应该允许多输入端口的多连接', () => {
      const edge1 = createMockEdge('edge-1', 'node-1', 'node-2')
      edge1.targetHandle = 'input2'

      const edge2 = createMockEdge('edge-2', 'node-3', 'node-2')
      edge2.targetHandle = 'input2'

      const nodes = [
        createMockNode('node-1'),
        createMockNode('node-2'),
        createMockNode('node-3'),
      ]
      const edges = [edge1]

      const result = validateEdge(edge2, nodes, edges)

      expect(result.valid).toBe(true)
    })

    it('应该在节点缺少 metadata 时容错处理', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'node-2')
      const nodes = [
        createMockNode('node-1'),
        { ...createMockNode('node-2'), metadata: undefined },
      ]

      const result = validateEdge(edge, nodes, [])

      // 应该发出警告但不失败
      expect(result.valid).toBe(true)
    })

    it('应该使用自定义验证规则', () => {
      const customRules = [
        {
          name: 'custom-rule',
          validate: () => false,
          errorMessage: '自定义错误',
        },
      ]

      const edge = createMockEdge('edge-1', 'node-1', 'node-2')
      const nodes = [createMockNode('node-1'), createMockNode('node-2')]

      const result = validateEdge(edge, nodes, [], customRules)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('自定义错误')
    })
  })

  describe('validateEdges', () => {
    it('应该过滤无效的边', () => {
      const edge1 = createMockEdge('edge-1', 'node-1', 'node-2')
      const edge2 = createMockEdge('edge-2', 'node-1', 'node-1') // 自连接，无效
      const nodes = [createMockNode('node-1'), createMockNode('node-2')]

      const result = validateEdges([edge1, edge2], nodes)

      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('edge-1')
    })

    it('应该返回所有有效边', () => {
      const edges = [
        createMockEdge('edge-1', 'node-1', 'node-2'),
        createMockEdge('edge-2', 'node-2', 'node-3'),
        createMockEdge('edge-3', 'node-3', 'node-1'),
      ]
      const nodes = [
        createMockNode('node-1'),
        createMockNode('node-2'),
        createMockNode('node-3'),
      ]

      const result = validateEdges(edges, nodes)

      expect(result).toHaveLength(3)
    })

    it('应该处理空的边数组', () => {
      const result = validateEdges([], [])
      expect(result).toHaveLength(0)
    })
  })

  describe('validateEdgesDetailed', () => {
    it('应该返回详细的验证结果', () => {
      const edge1 = createMockEdge('edge-1', 'node-1', 'node-2')
      const edge2 = createMockEdge('edge-2', 'node-1', 'node-1')
      const nodes = [createMockNode('node-1'), createMockNode('node-2')]

      const result = validateEdgesDetailed([edge1, edge2], nodes)

      expect(result.validEdges).toHaveLength(1)
      expect(result.invalidEdges).toHaveLength(1)
      expect(result.validEdges[0]!.id).toBe('edge-1')
      expect(result.invalidEdges[0]!.edge.id).toBe('edge-2')
      expect(result.invalidEdges[0]!.errors).toContain('不允许节点连接到自己')
    })

    it('应该包含无效边的错误信息', () => {
      const edge = createMockEdge('edge-1', 'unknown', 'node-2')
      const nodes = [createMockNode('node-2')]

      const result = validateEdgesDetailed([edge], nodes)

      expect(result.invalidEdges).toHaveLength(1)
      expect(result.invalidEdges[0]!.errors.length).toBeGreaterThan(0)
    })

    it('应该处理嵌套的分组节点', () => {
      const childNode = createMockNode('child-1')
      const groupNode = createMockNode('group-1', {
        isGroupNode: true,
        nodes: [childNode],
      })

      const edge = createMockEdge('edge-1', 'child-1', 'group-1')
      const nodes = [groupNode]

      const result = validateEdgesDetailed([edge], nodes)

      expect(result.validEdges).toHaveLength(1)
    })
  })

  describe('EDGE_VALIDATION_RULES', () => {
    it('应该包含 4 条内置规则', () => {
      expect(EDGE_VALIDATION_RULES).toHaveLength(4)
      expect(EDGE_VALIDATION_RULES.map(r => r.name)).toEqual([
        'nodes-exist',
        'no-self-connection',
        'no-duplicate',
        'input-single-connection',
      ])
    })
  })
})
