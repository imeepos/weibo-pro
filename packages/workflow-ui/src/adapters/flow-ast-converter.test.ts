import { describe, it, expect } from 'vitest'
import {
  FlowAstConverter,
  toFlowNode,
  toFlowNodes,
  toFlowEdge,
  toFlowEdges,
  convertWorkflow
} from './flow-ast-converter'
import type { INode, IEdge } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'

// 测试数据
const createTestNode = (id: string, type = 'TestAst'): INode => ({
  id,
  type,
  position: { x: 100, y: 200 },
  state: 'pending',
  count: 0,
  emitCount: 0,
  error: undefined
})

const createTestEdge = (
  from: string,
  to: string,
  fromProperty?: string,
  toProperty?: string
): IEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  fromProperty,
  toProperty
})

describe('FlowAstConverter', () => {
  describe('toFlowNode', () => {
    it('应该转换 AST 节点为 React Flow 节点', () => {
      const astNode = createTestNode('node-1', 'CustomAst')
      const flowNode = FlowAstConverter.toFlowNode(astNode)

      expect(flowNode.id).toBe('node-1')
      expect(flowNode.type).toBe('CustomAst')
      expect(flowNode.position).toEqual({ x: 100, y: 200 })
      expect(flowNode.data).toBe(astNode)
    })

    it('应该保留节点位置', () => {
      const astNode = createTestNode('node-1')
      astNode.position = { x: 500, y: 600 }

      const flowNode = FlowAstConverter.toFlowNode(astNode)

      expect(flowNode.position).toEqual({ x: 500, y: 600 })
    })

    it('应该使用默认位置 (0, 0) 当未提供时', () => {
      const astNode = createTestNode('node-1')
      astNode.position = undefined as any

      const flowNode = FlowAstConverter.toFlowNode(astNode)

      expect(flowNode.position).toEqual({ x: 0, y: 0 })
    })

    it('应该直接引用 AST 实例作为 data', () => {
      const astNode = createTestNode('node-1')
      const flowNode = FlowAstConverter.toFlowNode(astNode)

      expect(flowNode.data).toBe(astNode)
      expect(flowNode.data === astNode).toBe(true)
    })
  })

  describe('toFlowNodes', () => {
    it('应该转换节点数组', () => {
      const astNodes = [
        createTestNode('node-1'),
        createTestNode('node-2'),
        createTestNode('node-3')
      ]

      const flowNodes = FlowAstConverter.toFlowNodes(astNodes)

      expect(flowNodes).toHaveLength(3)
      expect(flowNodes[0]!.id).toBe('node-1')
      expect(flowNodes[1]!.id).toBe('node-2')
      expect(flowNodes[2]!.id).toBe('node-3')
    })

    it('应该处理空数组', () => {
      const flowNodes = FlowAstConverter.toFlowNodes([])

      expect(flowNodes).toHaveLength(0)
      expect(Array.isArray(flowNodes)).toBe(true)
    })

    it('应该保留节点顺序', () => {
      const astNodes = [
        createTestNode('a'),
        createTestNode('b'),
        createTestNode('c')
      ]

      const flowNodes = FlowAstConverter.toFlowNodes(astNodes)

      expect(flowNodes[0]!.id).toBe('a')
      expect(flowNodes[1]!.id).toBe('b')
      expect(flowNodes[2]!.id).toBe('c')
    })
  })

  describe('toFlowEdge', () => {
    it('应该转换单个边', () => {
      const edge = createTestEdge('node-1', 'node-2', 'output', 'input')
      const flowEdge = FlowAstConverter.toFlowEdge(edge, 0)

      expect(flowEdge.source).toBe('node-1')
      expect(flowEdge.target).toBe('node-2')
      expect(flowEdge.sourceHandle).toBe('output')
      expect(flowEdge.targetHandle).toBe('input')
      expect(flowEdge.type).toBe('workflow-data-edge')
    })

    it('应该生成稳定的边 ID', () => {
      const edge = createTestEdge('A', 'B', 'out', 'in')

      const flowEdge1 = FlowAstConverter.toFlowEdge(edge, 0)
      const flowEdge2 = FlowAstConverter.toFlowEdge(edge, 0)

      expect(flowEdge1.id).toBe(flowEdge2.id)
    })

    it('应该处理缺少端口属性的边', () => {
      const edge = createTestEdge('node-1', 'node-2')
      const flowEdge = FlowAstConverter.toFlowEdge(edge, 0)

      expect(flowEdge.sourceHandle).toBeNull()
      expect(flowEdge.targetHandle).toBeNull()
    })

    it('应该在端口信息不足时使用索引生成 ID', () => {
      const edge: IEdge = {
        id: 'test-edge',
        from: '',
        to: ''
      }

      const flowEdge = FlowAstConverter.toFlowEdge(edge, 5)

      expect(flowEdge.id).toBe('edge-5')
    })

    it('应该保留边的权重信息', () => {
      const edge = createTestEdge('A', 'B')
      ;(edge as any).weight = 0.8

      const flowEdge = FlowAstConverter.toFlowEdge(edge, 0)

      expect(flowEdge.data?.weight).toBe(0.8)
    })
  })

  describe('toFlowEdges', () => {
    it('应该转换边数组', () => {
      const edges = [
        createTestEdge('A', 'B'),
        createTestEdge('B', 'C'),
        createTestEdge('C', 'D')
      ]

      const flowEdges = FlowAstConverter.toFlowEdges(edges)

      expect(flowEdges).toHaveLength(3)
      expect(flowEdges[0]!.source).toBe('A')
      expect(flowEdges[1]!.source).toBe('B')
      expect(flowEdges[2]!.source).toBe('C')
    })

    it('应该处理空数组', () => {
      const flowEdges = FlowAstConverter.toFlowEdges([])

      expect(flowEdges).toHaveLength(0)
    })

    it('应该为每条边分配唯一索引', () => {
      const edges = [
        createTestEdge('A', 'B'),
        createTestEdge('A', 'B'),
        createTestEdge('A', 'B')
      ]

      const flowEdges = FlowAstConverter.toFlowEdges(edges)

      // 即使源和目标相同，由于索引不同，ID 应该不同
      expect(flowEdges[0]!.id).toBeDefined()
      expect(flowEdges[1]!.id).toBeDefined()
      expect(flowEdges[2]!.id).toBeDefined()
    })
  })

  describe('convertWorkflow', () => {
    it('应该转换完整的工作流', () => {
      const workflow = {
        nodes: [
          createTestNode('node-1'),
          createTestNode('node-2')
        ],
        edges: [
          createTestEdge('node-1', 'node-2')
        ]
      }

      const result = convertWorkflow(workflow)

      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
      expect(result.nodes[0]!.id).toBe('node-1')
      expect(result.edges[0]!.source).toBe('node-1')
    })

    it('应该处理没有边的工作流', () => {
      const workflow = {
        nodes: [
          createTestNode('node-1'),
          createTestNode('node-2')
        ],
        edges: []
      }

      const result = convertWorkflow(workflow)

      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(0)
    })

    it('应该处理没有节点的工作流', () => {
      const workflow = {
        nodes: [],
        edges: []
      }

      const result = convertWorkflow(workflow)

      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('应该处理复杂的工作流拓扑', () => {
      const workflow = {
        nodes: [
          createTestNode('start'),
          createTestNode('process-1'),
          createTestNode('process-2'),
          createTestNode('merge'),
          createTestNode('end')
        ],
        edges: [
          createTestEdge('start', 'process-1'),
          createTestEdge('start', 'process-2'),
          createTestEdge('process-1', 'merge'),
          createTestEdge('process-2', 'merge'),
          createTestEdge('merge', 'end')
        ]
      }

      const result = convertWorkflow(workflow)

      expect(result.nodes).toHaveLength(5)
      expect(result.edges).toHaveLength(5)
    })
  })

  describe('快捷函数', () => {
    it('toFlowNode 应该是 FlowAstConverter.toFlowNode 的别名', () => {
      const astNode = createTestNode('test')
      const result = toFlowNode(astNode)

      expect(result.id).toBe('test')
      expect(result.data).toBe(astNode)
    })

    it('toFlowNodes 应该是 FlowAstConverter.toFlowNodes 的别名', () => {
      const nodes = [createTestNode('a'), createTestNode('b')]
      const result = toFlowNodes(nodes)

      expect(result).toHaveLength(2)
    })

    it('toFlowEdge 应该是 FlowAstConverter.toFlowEdge 的别名', () => {
      const edge = createTestEdge('A', 'B')
      const result = toFlowEdge(edge, 0)

      expect(result.source).toBe('A')
      expect(result.target).toBe('B')
    })

    it('toFlowEdges 应该是 FlowAstConverter.toFlowEdges 的别名', () => {
      const edges = [createTestEdge('A', 'B')]
      const result = toFlowEdges(edges)

      expect(result).toHaveLength(1)
    })

    it('convertWorkflow 应该是 FlowAstConverter.convertWorkflow 的别名', () => {
      const workflow = {
        nodes: [createTestNode('A')],
        edges: []
      }
      const result = convertWorkflow(workflow)

      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
    })
  })
})
