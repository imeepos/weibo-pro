import { describe, it, expect, beforeEach } from 'vitest'
import { WorkflowGraphAst, Compiler, TextAreaAst } from '@sker/workflow'
import { root } from '@sker/core'
import { useWorkflowStore } from './workflow.store'

describe('WorkflowStore 集成 - 执行快照同步', () => {
  let compiler: Compiler

  beforeEach(() => {
    useWorkflowStore.getState().clear()
    compiler = root.get(Compiler)
  })

  it('应该在多节点更新后保留最终执行快照', () => {
    const store = useWorkflowStore.getState()

    const node1 = new TextAreaAst()
    node1.id = 'node1'
    node1.input = ['01']

    const node2 = new TextAreaAst()
    node2.id = 'node2'
    node2.input = ''

    const node3 = new TextAreaAst()
    node3.id = 'node3'
    node3.input = ['02']

    compiler.compile(node1)
    compiler.compile(node2)
    compiler.compile(node3)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'e2e-test-workflow'
    workflow.nodes = [node1, node2, node3]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'node1',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data',
      },
      {
        id: 'edge2',
        from: 'node3',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data',
      },
    ]

    compiler.compile(workflow)
    store.initWorkflow(workflow)

    store.updateNode('node1', { state: 'success', count: 1, output: '01' })
    store.updateNode('node3', { state: 'success', count: 1, output: '02' })
    store.updateNode('node2', { state: 'success', count: 1, input: ['01', '02'] })

    const latestStore = useWorkflowStore.getState()
    const exported = latestStore.toAst()
    const exportedNode2 = exported.nodes.find(node => node.id === 'node2')

    expect(exportedNode2).toBeDefined()
    expect(exportedNode2?.state).toBe('success')
    expect(exportedNode2?.count).toBe(1)
    expect(exportedNode2?.input).toEqual(['01', '02'])
  })

  it('应该支持直接修改 workflowAst 后通过 syncFromAst 刷新 Flow 节点', () => {
    const store = useWorkflowStore.getState()

    const node = new TextAreaAst()
    node.id = 'simple-node'
    node.input = ['test']

    compiler.compile(node)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'simple-workflow'
    workflow.nodes = [node]
    workflow.edges = []

    compiler.compile(workflow)
    store.initWorkflow(workflow)

    const latestStore = useWorkflowStore.getState()
    const astNode = latestStore.workflowAst?.nodes.find(item => item.id === 'simple-node')
    expect(astNode).toBeDefined()

    Object.assign(astNode!, {
      state: 'success',
      count: 1,
      output: 'test',
    })

    store.syncFromAst()

    const flowNode = useWorkflowStore.getState().nodes.find(item => item.id === 'simple-node')

    expect(flowNode?.data.state).toBe('success')
    expect(flowNode?.data.count).toBe(1)
    expect(flowNode?.data.output).toBe('test')
  })
})
