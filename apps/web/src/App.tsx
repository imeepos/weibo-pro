import { ReactFlowProvider } from '@xyflow/react'
import { WorkflowCanvas, PropertyPanel } from '@sker/workflow-ui'
import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react'
import "@sker/workflow-ast";
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

export default function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="flex h-screen bg-black">

          {/* 中间画布区域 */}
          <main className="flex-1">
            <WorkflowCanvas />
          </main>
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
