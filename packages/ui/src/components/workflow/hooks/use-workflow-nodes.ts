import { useCallback } from 'react'
import { useWorkflowCanvas } from './use-workflow-canvas'
import type { Node, NodeChange } from '@xyflow/react'

export function useWorkflowNodes() {
  const {
    nodes,
    addNode,
    removeNode,
    updateNode,
    setNodes,
    setSelectedNodes,
  } = useWorkflowCanvas()

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = nodes.slice()

      for (const change of changes) {
        if (change.type === 'add') {
          nextNodes.push(change.item)
        } else if (change.type === 'remove') {
          const index = nextNodes.findIndex((n) => n.id === change.id)
          if (index >= 0) {
            nextNodes.splice(index, 1)
          }
        } else if (change.type === 'select') {
          const node = nextNodes.find((n) => n.id === change.id)
          if (node) {
            node.selected = change.selected
          }
        } else if (change.type === 'position') {
          const node = nextNodes.find((n) => n.id === change.id)
          if (node && change.position) {
            node.position = change.position
          }
          if (node && change.positionAbsolute) {
            node.positionAbsolute = change.positionAbsolute
          }
        } else if (change.type === 'dimensions') {
          const node = nextNodes.find((n) => n.id === change.id)
          if (node && change.dimensions) {
            node.width = change.dimensions.width
            node.height = change.dimensions.height
          }
        }
      }

      setNodes(nextNodes)
    },
    [nodes, setNodes]
  )

  const getNode = useCallback(
    (id: string) => {
      return nodes.find((node) => node.id === id)
    },
    [nodes]
  )

  const getSelectedNodes = useCallback(() => {
    return nodes.filter((node) => node.selected)
  }, [nodes])

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId)
      if (!node) return

      const newNode: Node = {
        ...node,
        id: `${node.id}-copy-${Date.now()}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
      }

      addNode(newNode)
    },
    [getNode, addNode]
  )

  return {
    nodes,
    addNode,
    removeNode,
    updateNode,
    setNodes,
    handleNodesChange,
    getNode,
    getSelectedNodes,
    duplicateNode,
    setSelectedNodes,
  }
}