import { Ast } from '@sker/workflow'
import { WeiboKeywordSearchAst } from '@sker/workflow-ast'
import { ExecutorManager } from './executor-registry'

/**
 * 执行器系统演示
 *
 * 优雅设计：
 * - 展示如何使用前端执行器系统
 * - 演示通用执行器和特殊执行器的使用
 * - 提供完整的执行流程示例
 */
export async function demonstrateExecutorSystem(): Promise<void> {
  console.log('=== 前端执行器系统演示 ===')

  // 创建一个微博搜索AST节点
  const searchAst = new WeiboKeywordSearchAst()
  searchAst.keyword = '测试关键词'
  searchAst.startDate = new Date('2024-01-01')
  searchAst.endDate = new Date('2024-01-02')
  searchAst.page = 1

  console.log('创建微博搜索节点:', {
    keyword: searchAst.keyword,
    dateRange: `${searchAst.startDate} ~ ${searchAst.endDate}`,
    page: searchAst.page
  })

  try {
    // 使用执行器管理器执行节点
    console.log('开始执行节点...')

    const result = await ExecutorManager.executeNode(searchAst, {
      onStateChange: (state, error) => {
        console.log(`节点状态变化: ${state}`, error ? `错误: ${error.message}` : '')
      },
      onProgress: (progress, message) => {
        console.log(`执行进度: ${progress}%`, message ? `- ${message}` : '')
      },
      onResult: (resultData) => {
        console.log('执行结果:', resultData)
      }
    })

    console.log('节点执行完成:', {
      state: result.state,
      success: result.state === 'success',
      error: result.error
    })

  } catch (error) {
    console.error('执行失败:', error)
  }

  console.log('=== 演示结束 ===')
}

/**
 * 批量执行演示
 */
export async function demonstrateBatchExecution(): Promise<void> {
  console.log('=== 批量执行演示 ===')

  // 创建多个测试节点
  const asts: Ast[] = [
    new WeiboKeywordSearchAst(),
    new WeiboKeywordSearchAst(),
    new WeiboKeywordSearchAst()
  ]

  // 设置不同的参数
  asts.forEach((ast, index) => {
    if (ast instanceof WeiboKeywordSearchAst) {
      ast.keyword = `测试关键词${index + 1}`
      ast.startDate = new Date('2024-01-01')
      ast.endDate = new Date('2024-01-02')
      ast.page = 1
    }
  })

  console.log(`创建了 ${asts.length} 个测试节点`)

  try {
    const results = await ExecutorManager.executeNodes(asts, {
      onNodeStateChange: (nodeId, state, error) => {
        console.log(`节点 ${nodeId} 状态: ${state}`, error ? `错误: ${error.message}` : '')
      },
      onNodeProgress: (nodeId, progress, message) => {
        console.log(`节点 ${nodeId} 进度: ${progress}%`, message ? `- ${message}` : '')
      },
      onNodeResult: (nodeId, result) => {
        console.log(`节点 ${nodeId} 结果:`, result)
      }
    })

    console.log('批量执行完成:', {
      total: results.length,
      success: results.filter(r => r.state === 'success').length,
      failed: results.filter(r => r.state === 'fail').length
    })

  } catch (error) {
    console.error('批量执行失败:', error)
  }

  console.log('=== 批量演示结束 ===')
}