import { useEffect, useState } from 'react'
import {
  initializeFrontendExecutors,
  getExecutorSystemStatus,
  ExecutorManager
} from '@sker/workflow-ui'
import { WeiboKeywordSearchAst } from '@sker/workflow-ast'

/**
 * 执行器系统测试页面
 * 验证前端执行器系统的功能
 */
export function ExecutorTest() {
  const [status, setStatus] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>('')

  useEffect(() => {
    // 初始化执行器系统
    initializeFrontendExecutors()

    // 获取系统状态
    const systemStatus = getExecutorSystemStatus()
    setStatus(systemStatus)

    console.log('[ExecutorTest] 执行器系统状态:', systemStatus)
  }, [])

  const runTest = async () => {
    setTestResult('开始测试...')

    try {
      // 创建一个微博搜索AST节点
      const searchAst = new WeiboKeywordSearchAst()
      searchAst.keyword = '测试关键词'
      searchAst.startDate = new Date('2024-01-01')
      searchAst.endDate = new Date('2024-01-02')
      searchAst.page = 1

      setTestResult('创建微博搜索节点成功，开始执行...')

      // 使用执行器管理器执行节点
      const result = await ExecutorManager.executeNode(searchAst, {
        onStateChange: (state, error) => {
          setTestResult(prev => prev + `\n节点状态变化: ${state}` + (error ? ` 错误: ${error.message}` : ''))
        },
        onProgress: (progress, message) => {
          setTestResult(prev => prev + `\n执行进度: ${progress}%` + (message ? ` - ${message}` : ''))
        },
        onResult: (resultData) => {
          setTestResult(prev => prev + `\n执行结果: ${JSON.stringify(resultData, null, 2)}`)
        }
      })

      setTestResult(prev => prev + `\n节点执行完成: 状态=${result.state}, 成功=${result.state === 'success'}`)

    } catch (error) {
      setTestResult(prev => prev + `\n执行失败: ${error}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>前端执行器系统测试</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>系统状态</h2>
        <pre>{JSON.stringify(status, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runTest}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          运行测试
        </button>
      </div>

      <div>
        <h2>测试结果</h2>
        <pre style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          minHeight: '200px'
        }}>
          {testResult || '点击"运行测试"按钮开始测试...'}
        </pre>
      </div>
    </div>
  )
}