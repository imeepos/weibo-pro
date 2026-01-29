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

    // 验证基本信息
    expect(importedWorkflow.id).toBe('6b66e62a-302e-4ca0-b6fa-c2701b03d5ac')
    expect(importedWorkflow.name).toBe('豆包使用手册')

    // 验证节点数量
    expect(importedWorkflow.nodes.length).toBe(6)

    // 验证连线数量 - 这是关键的断言!
    expect(importedWorkflow.edges.length).toBe(4)

    // 验证每条连线的详细信息
    const edges = importedWorkflow.edges as any[]

    // 验证第一条连线: TextAreaAst -> PromptRoleSkillAst
    expect(edges[0].from).toBe('8dd7c959-8c65-4e2a-b687-54f45bcf2754')
    expect(edges[0].to).toBe('cdd666c9-9616-450c-b4c1-ab628bc1de02')
    expect(edges[0].fromProperty).toBe('output')
    expect(edges[0].toProperty).toBe('requirements')

    // 验证第二条连线: PromptRoleSkillAst -> TextAreaAst (selectedSkillsList)
    expect(edges[1].from).toBe('cdd666c9-9616-450c-b4c1-ab628bc1de02')
    expect(edges[1].to).toBe('10aec209-52d9-408b-85b4-2ee29ac8a732')
    expect(edges[1].fromProperty).toBe('selectedSkillsList')
    expect(edges[1].toProperty).toBe('input')

    // 验证第三条连线: PromptRoleSkillAst -> TextAreaAst (skillContent)
    expect(edges[2].from).toBe('cdd666c9-9616-450c-b4c1-ab628bc1de02')
    expect(edges[2].to).toBe('042f5b45-58c1-4459-bca7-e8c948f5106a')
    expect(edges[2].fromProperty).toBe('skillContent')
    expect(edges[2].toProperty).toBe('input')

    // 验证第四条连线: PromptRoleSkillAst -> TextAreaAst (skillContentText)
    expect(edges[3].from).toBe('cdd666c9-9616-450c-b4c1-ab628bc1de02')
    expect(edges[3].to).toBe('6d3b3d97-dd1b-4f75-9d1b-976b9f1981f6')
    expect(edges[3].fromProperty).toBe('skillContentText')
    expect(edges[3].toProperty).toBe('input')
  })
})
