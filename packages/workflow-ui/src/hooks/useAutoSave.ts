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
 * 优雅设计：
 * - 使用 RxJS Subject 统一收集所有保存请求
 * - debounceTime 防抖，避免频繁保存
 * - distinctUntilChanged 去重，相同状态不重复保存
 * - switchMap 确保只保留最新的保存请求
 * - 自动处理错误和清理订阅
 *
 * 存在即合理：
 * - 节点增删改时自动触发保存
 * - 防抖机制确保性能
 * - 响应式流确保状态一致性
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

  // 保存请求流
  const saveSubject$ = useRef(new Subject<WorkflowGraphAst>())

  // 保存中状态
  const isSavingRef = useRef(false)

  // 初始化自动保存流
  useEffect(() => {
    if (!enabled) return

    const controller = root.get<WorkflowController>(WorkflowController)

    const subscription = saveSubject$.current
      .pipe(
        // 防抖：1秒内多次变更只保存一次
        debounceTime(debounce),

        // 去重：相同的 AST 不重复保存（通过节点和边的数量判断）
        distinctUntilChanged((prev, curr) => {
          return (
            prev.nodes.length === curr.nodes.length &&
            prev.edges.length === curr.edges.length &&
            JSON.stringify(prev.nodes) === JSON.stringify(curr.nodes) &&
            JSON.stringify(prev.edges) === JSON.stringify(curr.edges)
          )
        }),

        // 日志：记录保存触发
        tap(ast => {
          console.log('[AutoSave] 触发保存:', {
            name: ast.name,
            nodes: ast.nodes.length,
            edges: ast.edges.length
          })
        }),

        // 切换到保存流：取消之前的保存请求，只执行最新的
        switchMap(ast => {
          isSavingRef.current = true

          // 保存前同步视口状态
          if (getViewport) {
            ast.viewport = getViewport()
          }

          return controller.saveWorkflow(ast).then(
            result => ({ success: true as const, result }),
            error => ({ success: false as const, error })
          )
        }),

        // 错误处理：捕获错误但不中断流
        catchError(error => {
          console.error('[AutoSave] 保存失败:', error)
          onSaveError?.(error as Error)
          isSavingRef.current = false
          return of(null)
        })
      )
      .subscribe({
        next: (result) => {
          isSavingRef.current = false

          if (result && 'success' in result) {
            if (result.success) {
              console.log('[AutoSave] 保存成功')
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

    // 清理订阅
    return () => {
      subscription.unsubscribe()
      saveSubject$.current.complete()
    }
  }, [enabled, debounce, onSaveSuccess, onSaveError, getViewport])

  /**
   * 触发保存
   *
   * 所有需要保存的操作都调用此方法
   * Subject 会自动合并、防抖、去重
   */
  const triggerSave = useCallback(() => {
    if (!enabled || !workflowAst) return

    // 发送到保存流
    saveSubject$.current.next(workflowAst)
  }, [enabled, workflowAst])

  /**
   * 立即保存（跳过防抖）
   *
   * 用于关键操作（如用户主动保存）
   */
  const saveNow = useCallback(async () => {
    if (!workflowAst) return

    const controller = root.get<WorkflowController>(WorkflowController)

    try {
      isSavingRef.current = true

      if (getViewport) {
        workflowAst.viewport = getViewport()
      }

      await controller.saveWorkflow(workflowAst)
      console.log('[AutoSave] 立即保存成功')
      onSaveSuccess?.()
    } catch (error) {
      console.error('[AutoSave] 立即保存失败:', error)
      onSaveError?.(error as Error)
      throw error
    } finally {
      isSavingRef.current = false
    }
  }, [workflowAst, getViewport, onSaveSuccess, onSaveError])

  return {
    triggerSave,
    saveNow,
    isSaving: () => isSavingRef.current
  }
}
