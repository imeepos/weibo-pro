import { CoreFlow, ReactFlowProvider, WorkflowCanvas } from '@sker/workflow-ui'
import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react'
import { WorkflowGraphAst, fromJson, toJson } from '@sker/workflow'
import type { Ast, INode } from '@sker/workflow'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'
import "@sker/workflow-ast";
import { ExecutorTest } from './pages/ExecutorTest';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>组件渲染错误</h1>
          <pre>{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * 工作流画布包装器
 *
 * 优雅设计：
 * - 根据 URL 参数自动加载或创建工作流
 * - 提供加载状态反馈
 * - 处理错误情况
 */
function WorkflowCanvasWrapper() {
  const [workflowName, setWorkflowName] = useState<string>('')
  const [node, setNode] = useState<INode | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initializeWorkflow() {
      try {
        // 获取 URL 参数
        const urlParams = new URLSearchParams(window.location.search)
        const name = urlParams.get('name') || '未命名工作流'
        setWorkflowName(name)

        console.log('初始化工作流', { name })

        // 尝试从后端加载工作流
        const controller = root.get<WorkflowController>(WorkflowController)
        const workflowData = await controller.getWorkflow({ name })

        if (workflowData) {
          // 工作流存在，反序列化
          console.log('找到已存在的工作流', workflowData)

          const ast = new WorkflowGraphAst()
          ast.id = workflowData.id
          ast.name = workflowData.name
          ast.nodes = workflowData.nodes.map(nodeJson => fromJson(nodeJson) as Ast)
          ast.edges = workflowData.edges
          ast.viewport = workflowData.viewport  // ← 恢复 viewport 状态

          setNode(toJson(ast))
        } else {
          // 工作流不存在，创建新的空白工作流
          console.log('工作流不存在，创建新的空白工作流', { name })

          const ast = new WorkflowGraphAst()
          ast.name = name

          setNode(toJson(ast))
        }
      } catch (err: any) {
        console.error('初始化工作流失败', err)
        setError(err.message || '初始化工作流失败')

        // 即使加载失败，也创建一个空白工作流
        const ast = new WorkflowGraphAst()
        ast.name = workflowName || '未命名工作流'
        setNode(toJson(ast))
      } finally {
        setIsLoading(false)
      }
    }

    initializeWorkflow()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111318] text-white">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#282e39] border-t-[#135bec]"></div>
          <p className="text-[#9da6b9]">正在加载工作流...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111318] text-white">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="mb-2 text-xl font-semibold">加载失败</h2>
          <p className="text-[#9da6b9]">{error}</p>
          <p className="mt-4 text-sm text-[#6b7280]">已自动创建新的工作流</p>
        </div>
      </div>
    )
  }

  return <CoreFlow
    node={node!}
  />
}

function Router() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 简单的路由匹配
  if (currentPath === '/executor-test') {
    return <ExecutorTest />
  }

  // 默认路由 - 工作流画布
  return (
    <ReactFlowProvider>
      <div className="flex h-screen bg-black">
        <main className="flex-1">
          <WorkflowCanvasWrapper />
        </main>
      </div>
    </ReactFlowProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  )
}
