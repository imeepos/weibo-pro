import { useEffect, useCallback } from 'react'

export interface KeyboardShortcutsOptions {
  enabled?: boolean
  onCopy?: () => void
  onCut?: () => void
  onPaste?: () => void
  onDelete?: () => void
  onSelectAll?: () => void
  onSave?: () => void
}

const isInputElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    target.isContentEditable
  )
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
  } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || isInputElement(event.target)) return

      const isMod = event.ctrlKey || event.metaKey

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        onDelete?.()
      } else if (isMod && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        onCopy?.()
      } else if (isMod && event.key.toLowerCase() === 'x') {
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
      } else if (event.key === 'Escape') {
        // Escape 由其他部分处理（如关闭菜单）
      }
    },
    [enabled, onCopy, onCut, onPaste, onDelete, onSelectAll, onSave]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
