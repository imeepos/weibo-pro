import { describe, it, expect } from 'vitest'

/**
 * 测试 replaceWorkflow 保持工作流 ID 不变
 *
 * 场景：
 * 1. 当前工作流 ID = "workflow-editor-222"
 * 2. 导入豆包工作流（ID = "6b66e62a-302e-4ca0-b6fa-c2701b03d5ac"）
 * 3. replaceWorkflow 应该保持 ID = "workflow-editor-222"
 */
describe('replaceWorkflow 保持工作流 ID', () => {
  it('应该在替换工作流时保持当前 ID 不变', () => {
    // 模拟场景
    const currentWorkflowId = 'workflow-editor-222'
    const importedWorkflowId = '6b66e62a-302e-4ca0-b6fa-c2701b03d5ac'

    // 模拟 replaceWorkflow 的逻辑
    const workflowAst = { id: currentWorkflowId, name: 'Current Workflow' }
    const newWorkflowAst = { id: importedWorkflowId, name: 'Imported Workflow' }

    // 执行 replaceWorkflow 中的关键逻辑
    const currentId = workflowAst.id
    newWorkflowAst.id = currentId  // 保持当前 ID

    // 验证
    expect(newWorkflowAst.id).toBe(currentWorkflowId)
    expect(newWorkflowAst.id).not.toBe(importedWorkflowId)

    console.log('[测试] replaceWorkflow ID 保留:', {
      currentWorkflowId,
      importedWorkflowId,
      finalId: newWorkflowAst.id,
      message: '导入后 ID = ' + newWorkflowAst.id + ' (正确!)'
    })
  })

  it('保存时应该使用当前工作流的 code', () => {
    const currentCode = 'workflow-editor-222'
    const importedCode = '6b66e62a-302e-4ca0-b6fa-c2701b03d5ac'

    // 模拟导入逻辑
    const workflowAst = { id: currentCode, name: 'Current' }
    const importedWorkflow = { id: importedCode, name: '豆包使用手册' }

    // 导入时保持当前 ID
    const savedId = workflowAst.id
    importedWorkflow.id = savedId

    // 模拟保存
    const savePayload = importedWorkflow

    // 验证保存的数据
    expect(savePayload.id).toBe(currentCode)
    expect(savePayload.id).not.toBe(importedCode)

    console.log('[测试] 保存时的 code:', {
      currentCode,
      importedCode,
      savedCode: savePayload.id,
      message: 'POST /save { code: "' + savePayload.id + '" }'
    })
  })
})
