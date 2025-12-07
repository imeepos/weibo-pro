import { useEffect, useCallback } from 'react'

export interface KeyboardShortcutsOptions {
  enabled?: boolean
  onCopy?: () => void
  onCut?: () => void
  onPaste?: () => void
  onDelete?: () => void
  onSelectAll?: () => void
  onSave?: () => void
  onCancel?: () => void
  onToggleCollapse?: () => void
  onCreateGroup?: () => void
  onUngroupNodes?: () => void
  onCollapseNodes?: () => void
  onExpandNodes?: () => void
  onAutoLayout?: () => void
  onUndo?: () => void
  onRedo?: () => void
}

/**
 * 检查事件目标是否为输入元素
 */
const isInputElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    target.isContentEditable
  )
}

/**
 * 检查事件是否发生在浮层容器内（Dialog、Drawer、Popover 等）
 * 这些浮层通过 Portal 渲染，通常在 body 下独立于画布
 */
const isInOverlayContainer = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false

  const element = target as HTMLElement
  const overlaySelectors = [
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[data-radix-popper-content-wrapper]',
    '[data-radix-dialog-content]',
    '[data-radix-alert-dialog-content]',
    '.sheet',
    '.drawer',
    '.popover',
  ]

  // 向上遍历，检查是否在浮层容器内
  let current: HTMLElement | null = element
  while (current && current !== document.body) {
    if (overlaySelectors.some(selector => current?.matches(selector))) {
      return true
    }
    current = current.parentElement
  }

  return false
}

/**
 * 检查用户是否正在选择文本
 */
const hasTextSelection = (): boolean => {
  const selection = window.getSelection()
  return selection ? selection.toString().length > 0 : false
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    enabled = true,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onSelectAll,
    onSave,
    onCancel,
    onToggleCollapse,
    onCreateGroup,
    onUngroupNodes,
    onCollapseNodes,
    onExpandNodes,
    onAutoLayout,
    onUndo,
    onRedo,
  } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // 优先级1：如果在浮层容器内（Dialog/Drawer/Popover等），完全不处理，让系统接管
      if (isInOverlayContainer(event.target)) {
        return
      }

      // 优先级2：如果是输入元素，不处理
      if (isInputElement(event.target)) {
        return
      }

      const isMod = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey

      // 优先级3：对于复制粘贴操作，如果有文本选中，让系统处理
      const hasSelection = hasTextSelection()

      // Esc 键取消运行
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel?.()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        onDelete?.()
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        onToggleCollapse?.()
      } else if (isMod && isShift && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        onRedo?.()
      } else if (isMod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        onUndo?.()
      } else if (isMod && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        if (isShift) {
          onUngroupNodes?.()
        } else {
          onCreateGroup?.()
        }
      } else if (isMod && isShift && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        onCollapseNodes?.()
      } else if (isMod && isShift && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        onExpandNodes?.()
      } else if (isMod && isShift && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        onAutoLayout?.()
      } else if (isMod && event.key.toLowerCase() === 'c') {
        // Ctrl+C: 如果有文本选中，让系统处理；否则复制节点
        if (hasSelection) {
          return
        }
        event.preventDefault()
        onCopy?.()
      } else if (isMod && event.key.toLowerCase() === 'x') {
        // Ctrl+X: 如果有文本选中，让系统处理；否则剪切节点
        if (hasSelection) {
          return
        }
        event.preventDefault()
        onCut?.()
      } else if (isMod && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        onPaste?.()
      } else if (isMod && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        onSelectAll?.()
      } else if (isMod && event.key.toLowerCase() === 's') {
        event.preventDefault()
        onSave?.()
      }
    },
    [enabled, onCopy, onCut, onPaste, onDelete, onSelectAll, onSave, onCancel, onToggleCollapse, onCreateGroup, onUngroupNodes, onCollapseNodes, onExpandNodes, onAutoLayout, onUndo, onRedo]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
