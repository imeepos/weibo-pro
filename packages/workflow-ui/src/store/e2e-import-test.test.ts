import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from './workflow.store'
import { fromJson, Compiler } from '@sker/workflow'
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
  let _compiler: any

  beforeEach(() => {
    root.set([{ provide: WorkflowEventBus, useClass: WorkflowEventBus }])
    useWorkflowStore.getState().clear()
    _compiler = root.get(Compiler)
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

    // 模拟导入流程: initWorkflow
    store.initWorkflow(importedWorkflow)

    const latestStore = useWorkflowStore.getState()

    console.log('[E2E测试] initWorkflow 后的 store 状态:', {
      hasWorkflowAst: !!latestStore.workflowAst,
      nodeCount: latestStore.nodes.length,
      edgeCount: latestStore.edges.length,
      workflowAstEdgeCount: latestStore.workflowAst?.edges?.length
    })

    // 验证结果
    expect(latestStore.workflowAst).toBeDefined()
    expect(latestStore.workflowAst?.id).toBe(data.workflow.id)
    expect(latestStore.workflowAst?.name).toBe(data.workflow.name)
    expect(latestStore.nodes.length).toBe(flowNodes.length)
    expect(latestStore.edges.length).toBe(flowEdges.length)
    expect(latestStore.workflowAst?.edges.length).toBe(importedWorkflow.edges.length)
  })
})
