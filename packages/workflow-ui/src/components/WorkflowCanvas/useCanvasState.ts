import { useCallback, useState } from 'react'
import { toast } from '@sker/ui/components/ui'
import { useCanvasDialogStates } from './useCanvasDialogStates'

export type ToastType = 'success' | 'error' | 'info'

/**
 * 画布状态管理 Hook
 *
 * 优雅设计：
 * - 集中管理所有 UI 状态，避免在组件中分散管理
 * - 提供清晰的状态更新接口
 * - 保持状态管理的单一职责
 * - 对话框状态拆分至 useCanvasDialogStates
 */
export function useCanvasState() {
  // 执行状态
  const [isRunning, setIsRunning] = useState(false)

  // 保存状态
  const [isSaving, setIsSaving] = useState(false)

  // 对话框/面板状态
  const dialogStates = useCanvasDialogStates()

  /**
   * 显示 Toast 提示
   */
  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const content = message ? `${title}\n${message}` : title
    toast[type](content)
  }, [])

  return {
    // 执行状态
    isRunning,
    setIsRunning,

    // 保存状态
    isSaving,
    setIsSaving,

    // Toast 提示
    showToast,

    ...dialogStates,
  }
}
