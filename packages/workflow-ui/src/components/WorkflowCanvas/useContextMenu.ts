import { useState, useCallback, useEffect } from 'react'
import type { XYPosition } from '@xyflow/react'

export interface ContextMenuState {
  visible: boolean
  screenPosition: { x: number; y: number }
  flowPosition: XYPosition
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    screenPosition: { x: 0, y: 0 },
    flowPosition: { x: 0, y: 0 },
  })

  const openMenu = useCallback(
    (screenPosition: { x: number; y: number }, flowPosition: XYPosition) => {
      console.log('[useContextMenu] openMenu called', {
        screenPosition,
        flowPosition,
      })
      setMenu({ visible: true, screenPosition, flowPosition })
    },
    []
  )

  const closeMenu = useCallback(() => {
    setMenu((prev) => ({ ...prev, visible: false }))
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
    closeMenu,
  }
}
