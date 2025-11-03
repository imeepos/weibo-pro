import { useState, useCallback, useEffect } from 'react'
import type { XYPosition } from '@xyflow/react'

export interface Position {
  x: number
  y: number
}

export type ContextType = 'canvas' | 'node' | 'edge'

export interface ContextMenuState {
  visible: boolean
  screenPosition: Position
  flowPosition: XYPosition
  contextType: ContextType
  targetId?: string
  targetData?: any
}

export interface NodeSelectorState {
  visible: boolean
  screenPosition: Position
  flowPosition: XYPosition
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    screenPosition: { x: 0, y: 0 },
    flowPosition: { x: 0, y: 0 },
    contextType: 'canvas',
    targetId: undefined,
    targetData: undefined,
  })

  const [nodeSelector, setNodeSelector] = useState<NodeSelectorState>({
    visible: false,
    screenPosition: { x: 0, y: 0 },
    flowPosition: { x: 0, y: 0 },
  })

  const openMenu = useCallback(
    (screenPosition: Position, flowPosition: XYPosition) => {
      console.log('[useContextMenu] openMenu called', {
        screenPosition,
        flowPosition,
      })
      setMenu({
        visible: true,
        screenPosition,
        flowPosition,
        contextType: 'canvas',
        targetId: undefined,
        targetData: undefined,
      })
    },
    []
  )

  const openNodeMenu = useCallback(
    (
      screenPosition: Position,
      flowPosition: XYPosition,
      nodeId: string,
      nodeData: any
    ) => {
      setMenu({
        visible: true,
        screenPosition,
        flowPosition,
        contextType: 'node',
        targetId: nodeId,
        targetData: nodeData,
      })
    },
    []
  )

  const openEdgeMenu = useCallback(
    (screenPosition: Position, flowPosition: XYPosition, edgeId: string) => {
      setMenu({
        visible: true,
        screenPosition,
        flowPosition,
        contextType: 'edge',
        targetId: edgeId,
        targetData: undefined,
      })
    },
    []
  )

  const closeMenu = useCallback(() => {
    setMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  const openNodeSelector = useCallback(
    (screenPosition: Position, flowPosition: XYPosition) => {
      setNodeSelector({ visible: true, screenPosition, flowPosition })
    },
    []
  )

  const closeNodeSelector = useCallback(() => {
    setNodeSelector((prev) => ({ ...prev, visible: false }))
  }, [])

  useEffect(() => {
    if (!menu.visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.context-menu')) {
        closeMenu()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menu.visible, closeMenu])

  return {
    menu,
    openMenu,
    openNodeMenu,
    openEdgeMenu,
    closeMenu,
    nodeSelector,
    openNodeSelector,
    closeNodeSelector,
  }
}
