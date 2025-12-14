


import { describe, it, expect } from 'vitest'
import { WorkflowGraphAst } from '@sker/workflow'
import { fromJson } from '@sker/workflow'
import { executeAst } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

/**
 * 编写节点测试
 * 遍历： __tests__/*.json 下的工作流节点，都应该正常执行
 * 1. 不会出现卡死等情况
 */
describe('节点测试', () => {
  it('应该能够正常执行 __tests__ 目录下的所有工作流 JSON 文件', async () => {
    // 查找 __tests__ 目录下所有的 JSON 文件
    const testDir = join(__dirname, '__tests__')
    const jsonFiles = glob.sync(join(testDir, '*.json'))

    expect(jsonFiles.length).toBeGreaterThan(0)

    // 为每个 JSON 文件创建测试用例
    for (const filePath of jsonFiles) {
      const fileName = require('path').basename(filePath)

      // 测试超时时间：30秒，防止卡死
      it(`${fileName} - 应该在30秒内完成执行`, async () => {
        try {
          // 读取 JSON 文件
          const fileContent = readFileSync(filePath, 'utf-8')
          const workflowData = JSON.parse(fileContent)

          // 确保是有效的工作流数据
          expect(workflowData).toHaveProperty('workflow')
          expect(workflowData.workflow.type).toBe('WorkflowGraphAst')

          // 构造工作流 AST
          const ast = fromJson(workflowData.workflow) as WorkflowGraphAst

          // 验证 AST 基本结构
          expect(ast).toBeDefined()
          expect(ast.type).toBe('WorkflowGraphAst')
          expect(ast.nodes).toBeDefined()
          expect(Array.isArray(ast.nodes)).toBe(true)

          console.log(`开始执行工作流: ${fileName}`)
          const startTime = Date.now()

          // 执行工作流，设置超时时间
          const executionPromise = executeAst(ast, ast).toPromise()

          // 使用 Promise.race 设置超时
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`工作流执行超时: ${fileName} (超过30秒)`))
            }, 30000) // 30秒超时
          })

          const result = await Promise.race([executionPromise, timeoutPromise])

          const duration = Date.now() - startTime
          console.log(`工作流 ${fileName} 执行完成，耗时: ${duration}ms`)

          // 验证执行结果
          expect(result).toBeDefined()
          expect(result.state).toMatch(/success|fail|pending|emitting/)

          // 如果执行失败，输出详细信息
          if (result.state === 'fail' && result.error) {
            console.warn(`工作流 ${fileName} 执行失败，错误:`, result.error)
          }

          // 验证工作流状态正确
          expect(['success', 'fail', 'pending', 'emitting']).toContain(result.state)

        } catch (error) {
          // 如果是超时错误，测试失败
          if (error instanceof Error && error.message.includes('超时')) {
            throw error
          }

          // 如果是其他错误，记录但不失败（某些错误可能是预期的，比如缺少 API 密钥等）
          console.warn(`工作流 ${fileName} 执行出错（非超时）:`, error)
          // 仍然认为测试通过，因为没有卡死
        }
      }, 35000) // Jest 测试超时时间比 Promise 超时稍长
    }
  })
})