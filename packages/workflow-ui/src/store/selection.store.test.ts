import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from './selection.store'

describe('Selection Store', () => {
  beforeEach(() => {
    useSelectionStore.setState({
      selectedNodeId: null,
      selectedEdgeId: null,
    })
  })

  describe('selectNode', () => {
    it('应该选择一个节点', () => {
      const { selectNode } = useSelectionStore.getState()
      selectNode('node-1')

      const state = useSelectionStore.getState()
      expect(state.selectedNodeId).toBe('node-1')
      expect(state.selectedEdgeId).toBeNull()
    })

    it('应该取消选择边当选择节点时', () => {
      const store = useSelectionStore.getState()
      store.selectEdge('edge-1')
      expect(useSelectionStore.getState().selectedEdgeId).toBe('edge-1')

      store.selectNode('node-1')
      const state = useSelectionStore.getState()
      expect(state.selectedNodeId).toBe('node-1')
      expect(state.selectedEdgeId).toBeNull()
    })

    it('应该支持传递 null 来取消选择', () => {
      const store = useSelectionStore.getState()
      store.selectNode('node-1')
      expect(useSelectionStore.getState().selectedNodeId).toBe('node-1')

      store.selectNode(null)
      expect(useSelectionStore.getState().selectedNodeId).toBeNull()
    })
  })

  describe('selectEdge', () => {
    it('应该选择一条边', () => {
      const { selectEdge } = useSelectionStore.getState()
      selectEdge('edge-1')

      const state = useSelectionStore.getState()
      expect(state.selectedEdgeId).toBe('edge-1')
      expect(state.selectedNodeId).toBeNull()
    })

    it('应该取消选择节点当选择边时', () => {
      const store = useSelectionStore.getState()
      store.selectNode('node-1')
      expect(useSelectionStore.getState().selectedNodeId).toBe('node-1')

      store.selectEdge('edge-1')
      const state = useSelectionStore.getState()
      expect(state.selectedEdgeId).toBe('edge-1')
      expect(state.selectedNodeId).toBeNull()
    })

    it('应该支持传递 null 来取消选择', () => {
      const store = useSelectionStore.getState()
      store.selectEdge('edge-1')
      expect(useSelectionStore.getState().selectedEdgeId).toBe('edge-1')

      store.selectEdge(null)
      expect(useSelectionStore.getState().selectedEdgeId).toBeNull()
    })
  })

  describe('clearSelection', () => {
    it('应该清空所有选择', () => {
      const store = useSelectionStore.getState()
      store.selectNode('node-1')
      store.selectEdge('edge-1')

      store.clearSelection()
      const state = useSelectionStore.getState()
      expect(state.selectedNodeId).toBeNull()
      expect(state.selectedEdgeId).toBeNull()
    })

    it('应该在没有选择时也能被调用', () => {
      const store = useSelectionStore.getState()
      store.clearSelection()

      const state = useSelectionStore.getState()
      expect(state.selectedNodeId).toBeNull()
      expect(state.selectedEdgeId).toBeNull()
    })
  })

  describe('选择状态互斥性', () => {
    it('不应该同时选择节点和边', () => {
      const store = useSelectionStore.getState()

      store.selectNode('node-1')
      let state = useSelectionStore.getState()
      expect(state.selectedNodeId).toBe('node-1')
      expect(state.selectedEdgeId).toBeNull()

      store.selectEdge('edge-1')
      state = useSelectionStore.getState()
      expect(state.selectedNodeId).toBeNull()
      expect(state.selectedEdgeId).toBe('edge-1')
    })

    it('应该允许快速切换选择', () => {
      const store = useSelectionStore.getState()

      store.selectNode('node-1')
      store.selectNode('node-2')
      expect(useSelectionStore.getState().selectedNodeId).toBe('node-2')

      store.selectEdge('edge-1')
      store.selectEdge('edge-2')
      expect(useSelectionStore.getState().selectedEdgeId).toBe('edge-2')
    })
  })
})
