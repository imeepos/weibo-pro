import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from './workflow.store'
import { WorkflowGraphAst, fromJson, toJson, Compiler } from '@sker/workflow'
import { TextAreaAst } from '@sker/workflow'
import { root } from '@sker/core'
import { WorkflowEventBus } from './test-utils'

/**
 * 单元测试：验证工作流导入时连线数据不会丢失
 *
 * 问题：工作流导入时,使用 Object.assign 直接赋值可能导致 edges 数据丢失
 *
 * 测试场景：
 * 1. 创建包含连线的工作流
 * 2. 导出为 JSON
 * 3. 导入 JSON
 * 4. 验证连线数据是否正确恢复
 */
describe('WorkflowStore - 工作流导入导出', () => {
  let compiler: Compiler

  beforeEach(() => {
    // 注册 mock 服务
    root.set([{ provide: WorkflowEventBus, useClass: WorkflowEventBus }])

    // 重置 store 状态
    const store = useWorkflowStore.getState()
    store.clear()

    // 获取编译器
    compiler = root.get(Compiler)
  })

  it('应该在导入后保留所有连线数据', () => {
    // 创建测试工作流
    const node1 = new TextAreaAst()
    node1.id = 'node1'
    node1.position = { x: 100, y: 100 }

    const node2 = new TextAreaAst()
    node2.id = 'node2'
    node2.position = { x: 300, y: 100 }

    const node3 = new TextAreaAst()
    node3.id = 'node3'
    node3.position = { x: 500, y: 100 }

    // 编译节点
    compiler.compile(node1)
    compiler.compile(node2)
    compiler.compile(node3)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'test-workflow'
    workflow.name = '测试工作流'
    workflow.nodes = [node1, node2, node3]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'node1',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
      },
      {
        id: 'edge2',
        from: 'node2',
        to: 'node3',
        fromProperty: 'output',
        toProperty: 'input',
      }
    ]

    // 编译工作流
    compiler.compile(workflow)

    console.log('[测试] 准备初始化工作流:', {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
      nodes: workflow.nodes.map(n => ({ id: n.id, type: n.type })),
      edges: workflow.edges.map(e => ({ id: e.id, from: e.from, to: e.to }))
    })

    // 导出工作流
    const exportedWorkflow = toJson(workflow)
    const exportData = {
      workflow: exportedWorkflow
    }

    console.log('[测试] 导出的工作流数据:', {
      nodeCount: exportData.workflow.nodes.length,
      edgeCount: exportData.workflow.edges.length,
      edges: exportData.workflow.edges.map((e: any) => ({
        id: e.id,
        from: e.from,
        to: e.to
      }))
    })

    // 导入工作流
    const importedWorkflow = fromJson<WorkflowGraphAst>(exportData.workflow)

    console.log('[测试] 导入的工作流数据:', {
      nodeCount: importedWorkflow.nodes.length,
      edgeCount: importedWorkflow.edges.length,
      edges: importedWorkflow.edges.map((e: any) => ({
        id: e.id,
        from: e.from,
        to: e.to
      }))
    })

    // 验证导入后的数据(不依赖 initWorkflow)
    expect(importedWorkflow.nodes.length).toBe(3)
    expect(importedWorkflow.edges.length).toBe(2) // 关键断言:连线应该被保留
  })

  it('应该正确处理空工作流的导入', () => {
    const store = useWorkflowStore.getState()

    // 创建空工作流
    const workflow = new WorkflowGraphAst()
    workflow.id = 'empty-workflow'
    workflow.name = '空工作流'
    workflow.nodes = []
    workflow.edges = []

    store.initWorkflow(workflow)

    expect(store.nodes.length).toBe(0)
    expect(store.edges.length).toBe(0)

    // 导出导入
    const exported = toJson(workflow)
    const imported = fromJson<WorkflowGraphAst>(exported)

    expect(imported.nodes.length).toBe(0)
    expect(imported.edges.length).toBe(0)
  })
})
