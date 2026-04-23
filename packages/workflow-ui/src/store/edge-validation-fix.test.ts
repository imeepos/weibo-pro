import { describe, it, expect } from 'vitest'
import { fromJson } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'
import { astToFlowEdges } from '../adapters/ast-to-flow'
import { validateEdgesDetailed } from '../utils/edgeValidator'

/**
 * 测试边验证逻辑修复
 *
 * 问题：validateEdgesDetailed 期望 React Flow Edge 格式，
 * 但导入时传入的是 IEdge 格式，导致所有边被误判为非法
 */
describe('边验证逻辑修复测试', () => {
  it('应该正确验证导入的工作流边（先转换为 Edge 格式）', () => {
    // 读取真实文件
    const filePath = join(__dirname, '../../../../workflow-豆包使用手册-1769728958258.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    // 反序列化
    const importedWorkflow = fromJson(data.workflow)

    console.log('[测试] 导入的工作流:', {
      nodeCount: importedWorkflow.nodes.length,
      edgeCount: importedWorkflow.edges.length
    })

    // 方法1：直接验证 IEdge（会失败，因为格式不匹配）
    const directValidation = validateEdgesDetailed(
      importedWorkflow.edges as any,
      importedWorkflow.nodes
    )

    console.log('[测试] 直接验证 IEdge 格式（错误方法）:', {
      validCount: directValidation.validEdges.length,
      invalidCount: directValidation.invalidEdges.length,
      sampleErrors: directValidation.invalidEdges[0]?.errors
    })

    // 方法2：先转换为 Edge 格式再验证（正确方法）
    const flowEdges = astToFlowEdges(importedWorkflow)
    const correctValidation = validateEdgesDetailed(
      flowEdges as any,
      importedWorkflow.nodes
    )

    console.log('[测试] 转换后验证 Edge 格式（正确方法）:', {
      validCount: correctValidation.validEdges.length,
      invalidCount: correctValidation.invalidEdges.length
    })

    const edgeCount = importedWorkflow.edges.length

    // 关键断言
    expect(edgeCount).toBe(data.workflow.edges.length)

    // 直接验证 IEdge 会失败（所有边被误判为非法）
    expect(directValidation.validEdges.length).toBe(0)
    expect(directValidation.invalidEdges.length).toBe(edgeCount)

    // 转换后验证 Edge 应该成功
    expect(correctValidation.validEdges.length).toBe(edgeCount)
    expect(correctValidation.invalidEdges.length).toBe(0)
  })
})
