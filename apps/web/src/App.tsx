import { ReactFlowProvider } from '@xyflow/react'
import { WorkflowCanvas } from '@sker/workflow-ui'
import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react'
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

function WorkflowCanvasWrapper() {
  const [workflowName, setWorkflowName] = React.useState<string>('')

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const name = urlParams.get('name') || ''
    setWorkflowName(name)
    console.log({ workflowName: name })
  }, [])

  return <WorkflowCanvas name={workflowName} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="flex h-screen bg-black">
          <main className="flex-1">
            <WorkflowCanvasWrapper />
          </main>
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
