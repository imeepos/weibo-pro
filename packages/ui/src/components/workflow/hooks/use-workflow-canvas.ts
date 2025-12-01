import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Node, Edge, Viewport } from '@xyflow/react'
import type { WorkflowCanvasState, WorkflowAction } from '../types/workflow-canvas'

interface WorkflowCanvasStore extends WorkflowCanvasState {
  // 操作方法
  addNode: (node: Node) => void
  removeNode: (id: string) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  addEdge: (edge: Edge) => void
  removeEdge: (id: string) => void
  updateEdge: (id: string, updates: Partial<Edge>) => void
  setSelectedNodes: (nodeIds: string[]) => void
  setSelectedEdges: (edgeIds: string[]) => void
  setViewport: (viewport: Viewport) => void
  setIsRunning: (isRunning: boolean) => void
  setIsSaving: (isSaving: boolean) => void

  // 批量操作
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void

  // 重置状态
  reset: () => void
}

const initialState: WorkflowCanvasState = {
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  isRunning: false,
  isSaving: false,
}

export const useWorkflowCanvas = create<WorkflowCanvasStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addNode: (node: Node) => {
        set((state: WorkflowCanvasStore) => ({
          nodes: [...state.nodes, node],
        }))
      },

      removeNode: (id: string) => {
        set((state: WorkflowCanvasStore) => ({
          nodes: state.nodes.filter((node: Node) => node.id !== id),
          edges: state.edges.filter(
            (edge: Edge) => edge.source !== id && edge.target !== id
          ),
          selectedNodes: state.selectedNodes.filter((nodeId: string) => nodeId !== id),
        }))
      },

      updateNode: (id: string, updates: Partial<Node>) => {
        set((state: WorkflowCanvasStore) => ({
          nodes: state.nodes.map((node: Node) =>
            node.id === id ? { ...node, ...updates } : node
          ),
        }))
      },

      addEdge: (edge: Edge) => {
        set((state: WorkflowCanvasStore) => ({
          edges: [...state.edges, edge],
        }))
      },

      removeEdge: (id: string) => {
        set((state: WorkflowCanvasStore) => ({
          edges: state.edges.filter((edge: Edge) => edge.id !== id),
          selectedEdges: state.selectedEdges.filter((edgeId: string) => edgeId !== id),
        }))
      },

      updateEdge: (id: string, updates: Partial<Edge>) => {
        set((state: WorkflowCanvasStore) => ({
          edges: state.edges.map((edge: Edge) =>
            edge.id === id ? { ...edge, ...updates } : edge
          ),
        }))
      },

      setSelectedNodes: (nodeIds: string[]) => {
        set({ selectedNodes: nodeIds })
      },

      setSelectedEdges: (edgeIds: string[]) => {
        set({ selectedEdges: edgeIds })
      },

      setViewport: (viewport: Viewport) => {
        set({ viewport })
      },

      setIsRunning: (isRunning: boolean) => {
        set({ isRunning })
      },

      setIsSaving: (isSaving: boolean) => {
        set({ isSaving })
      },

      setNodes: (nodes: Node[]) => {
        set({ nodes })
      },

      setEdges: (edges: Edge[]) => {
        set({ edges })
      },

      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'workflow-canvas-store',
    }
  )
)

// 选择器钩子
export const useWorkflowNodes = () => {
  return useWorkflowCanvas((state: WorkflowCanvasStore) => state.nodes)
}

export const useWorkflowEdges = () => {
  return useWorkflowCanvas((state: WorkflowCanvasStore) => state.edges)
}

export const useWorkflowSelectedNodes = () => {
  return useWorkflowCanvas((state: WorkflowCanvasStore) => state.selectedNodes)
}

export const useWorkflowSelectedEdges = () => {
  return useWorkflowCanvas((state: WorkflowCanvasStore) => state.selectedEdges)
}

export const useWorkflowViewport = () => {
  return useWorkflowCanvas((state: WorkflowCanvasStore) => state.viewport)
}

export const useWorkflowIsRunning = () => {
  return useWorkflowCanvas((state: WorkflowCanvasStore) => state.isRunning)
}

export const useWorkflowIsSaving = () => {
  return useWorkflowCanvas((state: WorkflowCanvasStore) => state.isSaving)
}