import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from './workflow.store'
import { fromJson, toJson, Compiler } from '@sker/workflow'
import { WorkflowEventBus } from './test-utils'
import { root } from '@sker/core'
import { readFileSync } from 'fs'
import { join } from 'path'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'

/**
 * 端到端测试:完整验证 useFileOperations 导入流程
 *
 * 模拟真实的导入过程,包括 fromJson + initWorkflow
 */
describe('E2E - 真实文件导入流程', () => {
  let compiler: any

  beforeEach(() => {
    root.set([{ provide: WorkflowEventBus, useClass: WorkflowEventBus }])
    useWorkflowStore.getState().clear()
    compiler = root.get(Compiler)
  })

  it('应该通过 initWorkflow 正确导入真实文件并保留连线', () => {
    const store = useWorkflowStore.getState()

    // 读取真实文件
    const filePath = join(__dirname, '../../../../workflow-豆包使用手册-1769728958258.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    console.log('[E2E测试] 原始数据:', {
      hasWorkflow: !!data.workflow,
      nodeCount: data.workflow?.nodes?.length,
      edgeCount: data.workflow?.edges?.length
    })

    // 模拟导入流程: fromJson
    const importedWorkflow = fromJson(data.workflow)

    console.log('[E2E测试] fromJson 后的数据:', {
      nodeCount: importedWorkflow.nodes?.length,
      edgeCount: importedWorkflow.edges?.length
    })

    // 测试 astToFlowNodes 和 astToFlowEdges
    const flowNodes = astToFlowNodes(importedWorkflow)
    const flowEdges = astToFlowEdges(importedWorkflow)

    console.log('[E2E测试] astToFlow 转换结果:', {
      flowNodesCount: flowNodes.length,
      flowEdgesCount: flowEdges.length
    })

    // 模拟导入流程: initWorkflow (这是我修复的关键部分)
    store.initWorkflow(importedWorkflow)

    console.log('[E2E测试] initWorkflow 后的 store 状态:', {
      hasWorkflowAst: !!store.workflowAst,
      nodeCount: store.nodes.length,
      edgeCount: store.edges.length,
      workflowAstEdgeCount: store.workflowAst?.edges?.length
    })

    // 验证结果
    expect(store.workflowAst).toBeDefined()
    expect(store.workflowAst?.id).toBe('6b66e62a-302e-4ca0-b6fa-c2701b03d5ac')
    expect(store.workflowAst?.name).toBe('豆包使用手册')

    // 关键断言: 节点和连线都应该被正确导入
    expect(store.nodes.length).toBe(6)
    expect(store.edges.length).toBe(4) // 这是关键!
    expect(store.workflowAst?.edges.length).toBe(4)
  })
})
