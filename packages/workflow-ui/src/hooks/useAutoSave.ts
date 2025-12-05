import { useEffect, useRef, useCallback } from 'react'
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of, tap } from 'rxjs'
import { WorkflowGraphAst } from '@sker/workflow'
import { WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'

interface AutoSaveOptions {
  /** 防抖时间（毫秒），默认 1000ms */
  debounce?: number
  /** 是否启用自动保存，默认 true */
  enabled?: boolean
  /** 保存成功回调 */
  onSaveSuccess?: () => void
  /** 保存失败回调 */
  onSaveError?: (error: Error) => void
  /** 获取视图状态 */
  getViewport?: () => { x: number; y: number; zoom: number }
}

/**
 * 自动保存 Hook
 *
 * 核心设计：
 * 1. Subject 统一收集保存请求 → debounceTime 防抖 → distinctUntilChanged 去重 → 保存到后端
 * 2. 关键点：useEffect 依赖只保留稳定值 [enabled, debounce]，避免订阅重建导致防抖失效
 * 3. 回调函数通过 callbacksRef 获取最新引用，避免闭包捕获旧值
 */
export function useAutoSave(
  workflowAst: WorkflowGraphAst | undefined,
  options: AutoSaveOptions = {}
) {
  const {
    debounce = 1000,
    enabled = true,
    onSaveSuccess,
    onSaveError,
    getViewport
  } = options

  const workflowAstRef = useRef(workflowAst)
  const callbacksRef = useRef({ onSaveSuccess, onSaveError, getViewport })

  useEffect(() => {
    workflowAstRef.current = workflowAst
    callbacksRef.current = { onSaveSuccess, onSaveError, getViewport }
  }, [workflowAst, onSaveSuccess, onSaveError, getViewport])

  const saveSubject$ = useRef<Subject<WorkflowGraphAst>>(undefined!)

  if (!saveSubject$.current) {
    saveSubject$.current = new Subject<WorkflowGraphAst>()
  }

  const isSavingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const controller = root.get<WorkflowController>(WorkflowController)

    const subscription = saveSubject$.current!
      .pipe(
        debounceTime(debounce),
        switchMap(ast => {
          isSavingRef.current = true

          const { getViewport } = callbacksRef.current
          if (getViewport) {
            ast.viewport = getViewport()
          }

          return controller.saveWorkflow(ast).then(
            result => ({ success: true as const, result }),
            error => ({ success: false as const, error })
          )
        }),
        catchError(error => {
          console.error('[AutoSave] 保存失败:', error)
          const { onSaveError } = callbacksRef.current
          onSaveError?.(error as Error)
          isSavingRef.current = false
          return of(null)
        })
      )
      .subscribe({
        next: (result) => {
          isSavingRef.current = false

          if (result && 'success' in result) {
            const { onSaveSuccess, onSaveError } = callbacksRef.current
            if (result.success) {
              onSaveSuccess?.()
            } else {
              console.error('[AutoSave] 保存失败:', result.error)
              onSaveError?.(result.error as Error)
            }
          }
        },
        error: (error) => {
          console.error('[AutoSave] 流错误:', error)
          isSavingRef.current = false
        }
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [enabled, debounce])

  /**
   * 触发保存
   * Subject 会自动防抖
   */
  const triggerSave = useCallback(() => {
    if (!enabled) return

    const currentAst = workflowAstRef.current
    if (!currentAst) return

    saveSubject$.current?.next(currentAst)
  }, [enabled])

  /**
   * 立即保存（跳过防抖）
   */
  const saveNow = useCallback(async () => {
    const currentAst = workflowAstRef.current
    if (!currentAst) return

    const controller = root.get<WorkflowController>(WorkflowController)

    try {
      isSavingRef.current = true

      const { getViewport, onSaveSuccess, onSaveError } = callbacksRef.current
      if (getViewport) {
        currentAst.viewport = getViewport()
      }

      await controller.saveWorkflow(currentAst)
      onSaveSuccess?.()
    } catch (error) {
      const { onSaveError } = callbacksRef.current
      onSaveError?.(error as Error)
      throw error
    } finally {
      isSavingRef.current = false
    }
  }, [])

  return {
    triggerSave,
    saveNow,
    isSaving: () => isSavingRef.current
  }
}
