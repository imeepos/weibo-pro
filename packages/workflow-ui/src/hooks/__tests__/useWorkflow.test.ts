import { renderHook, act } from '@testing-library/react'
import { useWorkflow } from '../useWorkflow'
import { WorkflowGraphAst, ArrayIteratorAst } from '@sker/workflow'

describe('useWorkflow', () => {
  it('初始化空白工作流 AST', () => {
    const { result } = renderHook(() => useWorkflow())

    expect(result.current.workflowAst).toBeInstanceOf(WorkflowGraphAst)
    expect(result.current.workflowAst.name).toBe('New Workflow')
    expect(result.current.workflowAst.state).toBe('pending')
    expect(result.current.workflowAst.nodes).toEqual([])
    expect(result.current.workflowAst.edges).toEqual([])
  })

  it('添加节点同步到 AST', () => {
    const { result } = renderHook(() => useWorkflow())

    act(() => {
      result.current.addNode(ArrayIteratorAst, { x: 100, y: 100 }, '数组迭代器')
    })

    expect(result.current.workflowAst.nodes).toHaveLength(1)
    expect(result.current.workflowAst.nodes[0]).toBeInstanceOf(ArrayIteratorAst)
    expect(result.current.nodes).toHaveLength(1)
  })

  it('删除节点同步到 AST', () => {
    const { result } = renderHook(() => useWorkflow())

    let nodeId: string

    act(() => {
      result.current.addNode(ArrayIteratorAst, { x: 100, y: 100 })
      nodeId = result.current.nodes[0].id
    })

    act(() => {
      result.current.removeNode(nodeId)
    })

    expect(result.current.workflowAst.nodes).toHaveLength(0)
    expect(result.current.nodes).toHaveLength(0)
  })

  it('连接节点同步到 AST', () => {
    const { result } = renderHook(() => useWorkflow())

    let sourceId: string
    let targetId: string

    act(() => {
      result.current.addNode(ArrayIteratorAst, { x: 100, y: 100 })
      result.current.addNode(ArrayIteratorAst, { x: 300, y: 100 })
      sourceId = result.current.nodes[0].id
      targetId = result.current.nodes[1].id
    })

    act(() => {
      result.current.connectNodes({
        source: sourceId,
        target: targetId,
        sourceHandle: 'currentItem',
        targetHandle: 'array',
      })
    })

    expect(result.current.workflowAst.edges).toHaveLength(1)
    expect(result.current.workflowAst.edges[0].from).toBe(sourceId)
    expect(result.current.workflowAst.edges[0].to).toBe(targetId)
    expect(result.current.edges).toHaveLength(1)
  })

  it('清空工作流同步到 AST', () => {
    const { result } = renderHook(() => useWorkflow())

    act(() => {
      result.current.addNode(ArrayIteratorAst, { x: 100, y: 100 })
      result.current.addNode(ArrayIteratorAst, { x: 300, y: 100 })
    })

    act(() => {
      result.current.clearWorkflow()
    })

    expect(result.current.workflowAst.nodes).toHaveLength(0)
    expect(result.current.workflowAst.edges).toHaveLength(0)
    expect(result.current.nodes).toHaveLength(0)
    expect(result.current.edges).toHaveLength(0)
  })

  it('使用已有 AST 初始化', () => {
    const existingAst = new WorkflowGraphAst()
    existingAst.setName('Existing Workflow')

    const node = new ArrayIteratorAst()
    node.id = 'test-node-1'
    existingAst.addNode(node)

    const { result } = renderHook(() => useWorkflow(existingAst))

    expect(result.current.workflowAst).toBe(existingAst)
    expect(result.current.workflowAst.name).toBe('Existing Workflow')
    expect(result.current.workflowAst.nodes).toHaveLength(1)
  })
})
