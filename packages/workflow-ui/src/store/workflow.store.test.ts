import { describe, it, expect, beforeEach } from 'vitest'
import { WorkflowGraphAst, Compiler, TextAreaAst } from '@sker/workflow'
import { root } from '@sker/core'
import { useWorkflowStore } from './workflow.store'

describe('WorkflowStore - AST 同步', () => {
  let compiler: Compiler

  beforeEach(() => {
    useWorkflowStore.getState().clear()
    compiler = root.get(Compiler)
  })

  it('应该通过 updateNode 同步 AST 节点和 Flow 节点数据', () => {
    const store = useWorkflowStore.getState()

    const node1 = new TextAreaAst()
    node1.id = 'node1'
    node1.input = ['01']

    const node2 = new TextAreaAst()
    node2.id = 'node2'
    node2.input = ''

    compiler.compile(node1)
    compiler.compile(node2)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'test-workflow'
    workflow.nodes = [node1, node2]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'node1',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data',
      },
    ]

    compiler.compile(workflow)
    store.initWorkflow(workflow)

    store.updateNode('node2', {
      input: ['01', '02'],
      state: 'success',
      count: 1,
    })

    const latestStore = useWorkflowStore.getState()
    const astNode2 = latestStore.workflowAst?.nodes.find(node => node.id === 'node2')
    const flowNode2 = latestStore.nodes.find(node => node.id === 'node2')

    expect(astNode2).toBeDefined()
    expect(astNode2?.input).toEqual(['01', '02'])
    expect(astNode2?.state).toBe('success')
    expect(astNode2?.count).toBe(1)
    expect(flowNode2?.data).toBe(astNode2)
  })

  it('toAst 应该返回带有最新执行快照的 workflowAst', () => {
    const store = useWorkflowStore.getState()

    const node1 = new TextAreaAst()
    node1.id = 'node1'
    node1.input = '01'

    const node2 = new TextAreaAst()
    node2.id = 'node2'
    node2.input = ''

    compiler.compile(node1)
    compiler.compile(node2)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'demo-workflow'
    workflow.nodes = [node1, node2]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'node1',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data',
      },
    ]

    compiler.compile(workflow)
    store.initWorkflow(workflow)

    store.updateNode('node1', { state: 'success', count: 1, output: '01' })
    store.updateNode('node2', { state: 'success', count: 1, input: ['01'] })

    const exported = useWorkflowStore.getState().toAst()
    const exportedNode2 = exported.nodes.find(node => node.id === 'node2')

    expect(exported.id).toBe('demo-workflow')
    expect(exportedNode2?.state).toBe('success')
    expect(exportedNode2?.count).toBe(1)
    expect(exportedNode2?.input).toEqual(['01'])
  })
})
