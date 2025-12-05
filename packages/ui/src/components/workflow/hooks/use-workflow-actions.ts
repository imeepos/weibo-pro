import { useCallback } from 'react'
import { useWorkflowCanvas } from './use-workflow-canvas'
import { useWorkflowNodes } from './use-workflow-nodes'
import { useWorkflowEdges } from './use-workflow-edges'

export function useWorkflowActions() {
  const { setIsRunning, setIsSaving, setViewport } = useWorkflowCanvas()
  const { nodes, setNodes, setSelectedNodes } = useWorkflowNodes()
  const { edges, setEdges, setSelectedEdges } = useWorkflowEdges()

  const runWorkflow = useCallback(
    async (nodeIds?: string[]) => {
      setIsRunning(true)
      try {
        // 这里可以调用实际的运行逻辑
        console.log('Running workflow with nodes:', nodeIds || 'all')
        // 模拟运行过程
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Failed to run workflow:', error)
      } finally {
        setIsRunning(false)
      }
    },
    [setIsRunning]
  )

  const saveWorkflow = useCallback(async () => {
    setIsSaving(true)
    try {
      // 这里可以调用实际的保存逻辑
      const workflowData = {
        nodes,
        edges,
        timestamp: new Date().toISOString(),
      }
      // 模拟保存过程
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error('Failed to save workflow:', error)
    } finally {
      setIsSaving(false)
    }
  }, [nodes, edges, setIsSaving])

  const exportWorkflow = useCallback(
    async (format: 'json' | 'image') => {
      try {
        if (format === 'json') {
          const workflowData = {
            nodes,
            edges,
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
          }
          const dataStr = JSON.stringify(workflowData, null, 2)
          const dataBlob = new Blob([dataStr], { type: 'application/json' })

          const url = URL.createObjectURL(dataBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'workflow.json'
          link.click()
          URL.revokeObjectURL(url)
        } else if (format === 'image') {
          // 这里可以实现导出为图片的逻辑
          console.log('Exporting workflow as image')
        }
      } catch (error) {
        console.error('Failed to export workflow:', error)
      }
    },
    [nodes, edges]
  )

  const importWorkflow = useCallback(
    async (data: any) => {
      try {
        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(data.nodes)
        }
        if (data.edges && Array.isArray(data.edges)) {
          setEdges(data.edges)
        }
      } catch (error) {
        console.error('Failed to import workflow:', error)
      }
    },
    [setNodes, setEdges]
  )

  const clearWorkflow = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNodes([])
    setSelectedEdges([])
    setViewport({ x: 0, y: 0, zoom: 1 })
  }, [setNodes, setEdges, setSelectedNodes, setSelectedEdges, setViewport])

  const fitView = useCallback(() => {
    // TODO: 实现适应视图逻辑（需要 React Flow 实例引用）
    console.log('Fitting view to nodes')
  }, [])

  const zoomIn = useCallback(() => {
    const { viewport } = useWorkflowCanvas.getState()
    setViewport({
      ...viewport,
      zoom: Math.min(viewport.zoom + 0.1, 2),
    })
  }, [setViewport])

  const zoomOut = useCallback(() => {
    const { viewport } = useWorkflowCanvas.getState()
    setViewport({
      ...viewport,
      zoom: Math.max(viewport.zoom - 0.1, 0.1),
    })
  }, [setViewport])

  const resetView = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 })
  }, [setViewport])

  return {
    runWorkflow,
    saveWorkflow,
    exportWorkflow,
    importWorkflow,
    clearWorkflow,
    fitView,
    zoomIn,
    zoomOut,
    resetView,
  }
}