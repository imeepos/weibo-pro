import { describe, it, expect } from 'vitest'
import { fromJson, generateId } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * 测试导入时 ID 重新生成
 *
 * 验证：
 * 1. 工作流 ID 被重新生成
 * 2. 所有节点 ID 被重新生成
 * 3. 所有边 ID 被重新生成
 * 4. 边的节点引用被正确更新
 */
describe('导入 ID 重新生成测试', () => {
  it('应该为导入的工作流生成新的唯一 ID', () => {
    // 读取真实文件
    const filePath = join(__dirname, '../../../../workflow-豆包使用手册-1769728958258.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    // 反序列化
    const importedWorkflow = fromJson(data.workflow)

    // 记录原始 ID
    const originalWorkflowId = importedWorkflow.id
    const originalNodeIds = importedWorkflow.nodes.map(n => n.id)
    const originalEdgeIds = importedWorkflow.edges.map(e => e.id)

    console.log('[测试] 原始 ID:', {
      workflowId: originalWorkflowId,
      nodeIds: originalNodeIds.slice(0, 3),
      edgeIds: originalEdgeIds
    })

    // 重新生成所有 ID（模拟 useFileOperations 中的逻辑）
    const idMap = new Map<string, string>()

    // 重新生成工作流 ID
    importedWorkflow.id = generateId()
    idMap.clear()

    // 递归处理节点
    const processNodes = (nodes: any[]): any[] => {
      return nodes.map(node => {
        const oldId = node.id
        const newId = generateId()
        idMap.set(oldId, newId)
        node.id = newId

        if (node.isGroupNode && node.nodes?.length > 0) {
          node.nodes = processNodes(node.nodes)
        }

        return node
      })
    }

    importedWorkflow.nodes = processNodes(importedWorkflow.nodes)

    // 处理边
    importedWorkflow.edges = importedWorkflow.edges.map(edge => {
      edge.id = generateId()

      if (edge.from && idMap.has(edge.from)) {
        edge.from = idMap.get(edge.from)!
      }
      if (edge.to && idMap.has(edge.to)) {
        edge.to = idMap.get(edge.to)!
      }

      return edge
    })

    // 更新入口节点引用
    if (importedWorkflow.entryNodeIds) {
      importedWorkflow.entryNodeIds = importedWorkflow.entryNodeIds.map(id =>
        idMap.get(id) || id
      )
    }

    console.log('[测试] 重新生成后的 ID:', {
      newWorkflowId: importedWorkflow.id,
      newNodeIds: importedWorkflow.nodes.map(n => n.id).slice(0, 3),
      newEdgeIds: importedWorkflow.edges.map(e => e.id),
      edges: importedWorkflow.edges.map(e => ({
        id: e.id,
        from: e.from,
        to: e.to
      }))
    })

    // 验证所有 ID 都已改变
    expect(importedWorkflow.id).not.toBe(originalWorkflowId)
    expect(importedWorkflow.nodes[0].id).not.toBe(originalNodeIds[0])
    expect(importedWorkflow.edges[0]?.id).not.toBe(originalEdgeIds[0])

    // 入口节点引用也应该被映射到新节点 ID
    importedWorkflow.entryNodeIds?.forEach(id => {
      expect(importedWorkflow.nodes.some(node => node.id === id)).toBe(true)
    })

    // 验证所有边仍然有效（节点存在）
    importedWorkflow.edges.forEach(edge => {
      const sourceExists = importedWorkflow.nodes.some(n => n.id === edge.from)
      const targetExists = importedWorkflow.nodes.some(n => n.id === edge.to)
      expect(sourceExists).toBe(true)
      expect(targetExists).toBe(true)
    })
  })
})
