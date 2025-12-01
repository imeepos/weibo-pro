import { useCallback } from 'react'
import { useWorkflowCanvas } from './use-workflow-canvas'
import type { Edge, EdgeChange, Connection } from '@xyflow/react'

export function useWorkflowEdges() {
  const {
    edges,
    addEdge,
    removeEdge,
    updateEdge,
    setEdges,
    setSelectedEdges,
  } = useWorkflowCanvas()

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const nextEdges = edges.slice()

      for (const change of changes) {
        if (change.type === 'add') {
          nextEdges.push(change.item)
        } else if (change.type === 'remove') {
          const index = nextEdges.findIndex((e: Edge) => e.id === change.id)
          if (index >= 0) {
            nextEdges.splice(index, 1)
          }
        } else if (change.type === 'select') {
          const edge = nextEdges.find((e: Edge) => e.id === change.id)
          if (edge) {
            edge.selected = change.selected
          }
        }
      }

      setEdges(nextEdges)
    },
    [edges, setEdges]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'smoothstep',
      }
      addEdge(newEdge)
    },
    [addEdge]
  )

  const getEdge = useCallback(
    (id: string) => {
      return edges.find((edge: Edge) => edge.id === id)
    },
    [edges]
  )

  const getSelectedEdges = useCallback(() => {
    return edges.filter((edge: Edge) => edge.selected)
  }, [edges])

  const getConnectedEdges = useCallback(
    (nodeId: string) => {
      return edges.filter(
        (edge: Edge) => edge.source === nodeId || edge.target === nodeId
      )
    },
    [edges]
  )

  return {
    edges,
    addEdge,
    removeEdge,
    updateEdge,
    setEdges,
    handleEdgesChange,
    handleConnect,
    getEdge,
    getSelectedEdges,
    getConnectedEdges,
    setSelectedEdges,
  }
}