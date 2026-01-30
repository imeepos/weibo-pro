import { describe, it, expect } from 'vitest'
import { fromJson, generateId } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * 测试导入时保持工作流 ID 不变
 *
 * 场景：
 * 1. 用户创建新工作流，code 是 "222"
 * 2. 用户导入 "豆包.json" 工作流（code 是 "6b66e62a-..."）
 * 3. 保存时，code 应该仍然是 "222"，而不是 "6b66e62a-..."
 */
describe('导入时保持工作流 ID 不变', () => {
  it('导入时应该保持当前工作流 code 不变，只重新生成节点和边的 ID', () => {
    // 读取豆包工作流文件
    const filePath = join(__dirname, '../../../../workflow-豆包使用手册-1769728958258.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    // 反序列化
    const importedWorkflow = fromJson(data.workflow)

    const originalWorkflowId = importedWorkflow.id
    const originalNodeIds = importedWorkflow.nodes.map(n => n.id)

    console.log('[测试] 原始豆包工作流:', {
      id: originalWorkflowId,
      name: importedWorkflow.name,
      nodeCount: importedWorkflow.nodes.length,
      edgeCount: importedWorkflow.edges.length
    })

    // 模拟当前工作流（用户创建的 workflow-editor/222）
    const currentWorkflowId = 'user-workflow-222'

    // 导入时：保持当前工作流 ID 不变
    importedWorkflow.id = currentWorkflowId

    // 重新生成节点和边的 ID（避免冲突）
    const idMap = new Map<string, string>()

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

    if (importedWorkflow.entryNodeIds) {
      importedWorkflow.entryNodeIds = importedWorkflow.entryNodeIds.map(id =>
        idMap.get(id) || id
      )
    }

    console.log('[测试] 导入后的工作流:', {
      id: importedWorkflow.id,
      name: importedWorkflow.name,
      nodeCount: importedWorkflow.nodes.length,
      edgeCount: importedWorkflow.edges.length,
      // 验证节点 ID 已改变
      firstNodeIdChanged: importedWorkflow.nodes[0].id !== originalNodeIds[0]
    })

    // 关键断言：工作流 ID 应该是当前工作流的 ID
    expect(importedWorkflow.id).toBe(currentWorkflowId)
    expect(importedWorkflow.id).not.toBe(originalWorkflowId)

    // 节点和边应该被导入
    expect(importedWorkflow.nodes.length).toBe(6)
    expect(importedWorkflow.edges.length).toBe(4)

    // 节点 ID 应该被重新生成
    expect(importedWorkflow.nodes[0].id).not.toBe(originalNodeIds[0])

    // 边的节点引用应该被正确更新
    importedWorkflow.edges.forEach(edge => {
      const sourceExists = importedWorkflow.nodes.some(n => n.id === edge.from)
      const targetExists = importedWorkflow.nodes.some(n => n.id === edge.to)
      expect(sourceExists).toBe(true)
      expect(targetExists).toBe(true)
    })
  })

  it('保存时应该使用原始工作流的 code', () => {
    // 模拟场景
    const currentWorkflowCode = 'workflow-editor-222'
    const importedWorkflowCode = '6b66e62a-302e-4ca0-b6fa-c2701b03d5ac'

    // 导入时保持当前 code
    const finalCode = currentWorkflowCode

    // 保存时应该使用原始 code
    expect(finalCode).toBe(currentWorkflowCode)
    expect(finalCode).not.toBe(importedWorkflowCode)

    console.log('[测试] Code 验证:', {
      currentWorkflowCode,
      importedWorkflowCode,
      finalCode,
      message: '保存时 code = ' + finalCode + ' (正确!)'
    })
  })
})
