import { describe, it, expect } from 'vitest'
import { fromJson } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * 真实文件测试:验证导入实际导出的工作流文件时连线不会丢失
 *
 * 使用真实的导出文件: workflow-豆包使用手册-1769728958258.json
 */
describe('真实文件导入测试 - 豆包使用手册', () => {
  it('应该正确导入真实的工作流文件并保留所有连线', () => {
    // 读取真实的导出文件
    const filePath = join(__dirname, '../../../../workflow-豆包使用手册-1769728958258.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    console.log('[真实文件测试] 原始数据:', {
      hasWorkflow: !!data.workflow,
      nodeCount: data.workflow?.nodes?.length,
      edgeCount: data.workflow?.edges?.length
    })

    // 使用 fromJson 导入
    const importedWorkflow = fromJson(data.workflow)

    console.log('[真实文件测试] 导入后的数据:', {
      id: importedWorkflow.id,
      name: importedWorkflow.name,
      nodeCount: importedWorkflow.nodes?.length,
      edgeCount: importedWorkflow.edges?.length,
      edges: importedWorkflow.edges?.map((e: any) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        fromProperty: e.fromProperty,
        toProperty: e.toProperty
      }))
    })

    expect(importedWorkflow.id).toBe(data.workflow.id)
    expect(importedWorkflow.name).toBe(data.workflow.name)
    expect(importedWorkflow.nodes.length).toBe(data.workflow.nodes.length)
    expect(importedWorkflow.edges.length).toBe(data.workflow.edges.length)

    const expectedEdges = data.workflow.edges.map((edge: any) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      fromProperty: edge.fromProperty,
      toProperty: edge.toProperty,
    }))

    const importedEdges = importedWorkflow.edges.map((edge: any) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      fromProperty: edge.fromProperty,
      toProperty: edge.toProperty,
    }))

    expect(importedEdges).toEqual(expectedEdges)
  })
})
